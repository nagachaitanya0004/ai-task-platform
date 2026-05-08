const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(100)
    .required(),
  inputText: Joi.string()
    .min(1)
    .max(10000)
    .required(),
  operation: Joi.string()
    .valid('summarize', 'analyze', 'extract')
    .required()
});

module.exports = {
  createTaskSchema
};
