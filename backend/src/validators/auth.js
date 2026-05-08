const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[0-9])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 1 uppercase letter and 1 number'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .required()
});

module.exports = {
  registerSchema,
  loginSchema
};
