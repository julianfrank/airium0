import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface DomainStackProps extends StackProps {
  domainName: string;
  environment: string;
  hostedZoneId?: string;
  certificateArn?: string;
  enableCloudFront?: boolean;
  originBucket?: s3.Bucket;
}

export class DomainStack extends Stack {
  public readonly certificate: certificatemanager.Certificate;
  public readonly hostedZone?: route53.IHostedZone;
  public readonly distribution?: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: DomainStackProps) {
    super(scope, id, props);

    // Get or create hosted zone
    if (props.hostedZoneId) {
      this.hostedZone = route53.HostedZone.fromHostedZoneId(
        this,
        'HostedZone',
        props.hostedZoneId
      );
    } else {
      // Extract root domain from full domain name
      const rootDomain = this.extractRootDomain(props.domainName);
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: rootDomain,
      });
    }

    // Create or import SSL certificate
    if (props.certificateArn) {
      this.certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.certificateArn
      ) as certificatemanager.Certificate;
    } else {
      this.certificate = new certificatemanager.Certificate(this, 'Certificate', {
        domainName: props.domainName,
        subjectAlternativeNames: [`*.${props.domainName}`],
        validation: certificatemanager.CertificateValidation.fromDns(this.hostedZone),
      });
    }

    // Create CloudFront distribution if enabled
    if (props.enableCloudFront && props.originBucket) {
      this.distribution = this.createCloudFrontDistribution(props);
    }
  }

  private extractRootDomain(domainName: string): string {
    const parts = domainName.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return domainName;
  }

  private createCloudFrontDistribution(props: DomainStackProps): cloudfront.Distribution {
    if (!props.originBucket) {
      throw new Error('Origin bucket is required for CloudFront distribution');
    }

    // Create Origin Access Control for S3
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      description: `OAC for ${props.domainName}`,
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    });

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(props.originBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: this.createSecurityHeadersPolicy(),
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin('api.example.com'), // This will be replaced with actual API Gateway domain
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      domainNames: [props.domainName],
      certificate: this.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing
          ttl: Duration.minutes(5),
        },
      ],
      enableLogging: true,
      comment: `AIrium ${props.environment} CloudFront Distribution`,
    });

    // Create Route53 record for the distribution
    if (this.hostedZone) {
      new route53.ARecord(this, 'AliasRecord', {
        zone: this.hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(distribution)
        ),
      });

      // Create AAAA record for IPv6
      new route53.AaaaRecord(this, 'AliasRecordIPv6', {
        zone: this.hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(distribution)
        ),
      });
    }

    return distribution;
  }

  private createSecurityHeadersPolicy(): cloudfront.ResponseHeadersPolicy {
    return new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: `airium-security-headers-${this.stackName}`,
      comment: 'Security headers for AIrium application',
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(31536000), // 1 year
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.amazonaws.com wss://*.amazonaws.com",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'X-Robots-Tag',
            value: 'noindex, nofollow',
            override: true,
          },
          {
            header: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
            override: false,
          },
        ],
      },
    });
  }

  // Method to update API Gateway origin after deployment
  public updateApiGatewayOrigin(apiDomainName: string) {
    if (this.distribution) {
      // This would typically be done through a custom resource or manual update
      // For now, we'll document the process
      console.log(`Update CloudFront distribution to use API Gateway domain: ${apiDomainName}`);
    }
  }
}