/**
 * Post-confirmation Lambda trigger
 * Automatically assigns new users to the GENERAL group and sets default profile
 */
export const handler = async (event) => {
  const { userPoolId, userName } = event;
  
  try {
    // Import AWS SDK v3
    const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminUpdateUserAttributesCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION
    });
    
    // Add user to GENERAL group by default
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: userName,
      GroupName: 'GENERAL'
    });
    
    await cognitoClient.send(addToGroupCommand);
    
    // Set default user profile attribute
    const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: [
        {
          Name: 'custom:userProfile',
          Value: 'GENERAL'
        },
        {
          Name: 'custom:groups',
          Value: JSON.stringify(['GENERAL'])
        }
      ]
    });
    
    await cognitoClient.send(updateAttributesCommand);
    
    console.log(`User ${userName} successfully added to GENERAL group with default profile`);
    
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    throw error;
  }
  
  return event;
};