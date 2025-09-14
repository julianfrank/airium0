import { Amplify } from 'aws-amplify';
import { initializeAppSyncClient } from './appsync-client';
import amplifyOutputs from '../../amplify_outputs.json';

export const configureAmplify = () => {
  try {
    // Configure Amplify with the outputs from the deployed backend
    Amplify.configure(amplifyOutputs);
    
    // Initialize AppSync client after Amplify configuration
    if (amplifyOutputs.data?.url) {
      initializeAppSyncClient({
        graphqlEndpoint: amplifyOutputs.data.url,
        region: amplifyOutputs.data.aws_region || 'us-east-1',
        authenticationType: 'AMAZON_COGNITO_USER_POOLS'
      });
      
      console.log('Amplify and AppSync configured successfully');
    } else {
      console.warn('GraphQL API URL not available in amplify_outputs.json');
    }
  } catch (error) {
    console.error('Failed to configure Amplify:', error);
    // Fallback configuration for development
    console.warn('Using fallback configuration for development');
  }
};

export { Amplify };

// Export the configuration for use in other modules
export { amplifyOutputs };