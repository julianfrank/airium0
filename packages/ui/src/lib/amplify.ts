import { Amplify } from 'aws-amplify';
import { initializeAppSyncClient } from './appsync-client';

// This will be populated from the Core module's amplify_outputs.json
// For now, we'll create a placeholder configuration
const amplifyConfig = {
  // Configuration will be imported from @airium/core/amplify_outputs.json
  // when the Core module is fully set up
  API: {
    GraphQL: {
      endpoint: process.env.GRAPHQL_API_URL || '',
      region: process.env.AWS_REGION || 'us-east-1',
      defaultAuthMode: 'userPool'
    }
  },
  Auth: {
    Cognito: {
      userPoolId: process.env.USER_POOL_ID || '',
      userPoolClientId: process.env.USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.IDENTITY_POOL_ID || '',
    }
  }
};

export const configureAmplify = () => {
  try {
    // Import amplify_outputs.json from Core module
    // This will be updated once the Core module generates the outputs
    console.log('Amplify configuration will be loaded from Core module');
    
    // For now, configure with environment variables or defaults
    if (process.env.GRAPHQL_API_URL) {
      Amplify.configure(amplifyConfig);
      
      // Initialize AppSync client after Amplify configuration
      initializeAppSyncClient({
        graphqlEndpoint: process.env.GRAPHQL_API_URL,
        region: process.env.AWS_REGION || 'us-east-1',
        authenticationType: 'AMAZON_COGNITO_USER_POOLS'
      });
      
      console.log('Amplify and AppSync configured successfully');
    } else {
      console.warn('GraphQL API URL not available, skipping configuration');
    }
  } catch (error) {
    console.warn('Amplify configuration not yet available from Core module:', error);
  }
};

export { Amplify };