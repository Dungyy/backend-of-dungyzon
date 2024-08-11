import Joi from 'joi';

export const validateProductId = (productId) => {
  const schema = Joi.string().required().pattern(/^[A-Z0-9]{10}$/);
  return schema.validate(productId);
};

export const validateSearchQuery = (searchQuery) => {
  const schema = Joi.string().required().min(1).max(200);
  return schema.validate(searchQuery);
};
