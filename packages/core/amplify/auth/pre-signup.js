/**
 * Pre-signup Lambda trigger
 * Validates email domain and sets up initial user attributes
 */
export const handler = async (event) => {
  const { userAttributes } = event.request;
  
  try {
    // Auto-confirm user (remove this if you want email verification)
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    
    // Log the signup attempt
    console.log(`Pre-signup processing for user: ${userAttributes.email}`);
    
    // You can add custom validation logic here
    // For example, restrict to certain email domains:
    // const allowedDomains = ['company.com', 'organization.org'];
    // const emailDomain = userAttributes.email.split('@')[1];
    // if (!allowedDomains.includes(emailDomain)) {
    //   throw new Error('Email domain not allowed');
    // }
    
  } catch (error) {
    console.error('Error in pre-signup trigger:', error);
    throw error;
  }
  
  return event;
};