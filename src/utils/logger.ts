// Custom logger to maintain code cleanliness and consistency while logging 
export const logger = (type: string, message: string) => {
  console.log(`${type}: ${message}`);
};
