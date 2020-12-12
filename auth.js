const jwt = require('express-jwt');

const ApplicationError = require('./errors');

const getTokenFromHeaders = req => {
  const {
    headers: { authorization },
  } = req;

  if (authorization && authorization.split(' ')[0] === 'Bearer') {
    return authorization.split(' ')[1];
  }
  return null;
};

const middleware = {
  required: secret =>
    jwt({
      secret: secret,
      algorithms: ['HS256'],
      getToken: getTokenFromHeaders,
    }),
  optional: secret =>
    jwt({
      secret: secret,
      algorithms: ['HS256'],
      getToken: getTokenFromHeaders,
      credentialsRequired: false,
    }),
};

module.exports = {
  middleware,
  is: role => (req, res, next) => {
    if (
      role === '*' ||
      (req.user &&
        typeof role === 'string' &&
        role.length > 0 &&
        role
          .split(',')
          .reduce((roles, role) => {
            if (role === 'User') {
              roles.push('Admin');
            }
            roles.push(role);
            return roles;
          }, [])
          .indexOf(req.user.data.role) > -1)
    ) {
      return next();
    }

    throw new ApplicationError('Unauthorized access.', {
      status: 403,
    });
  },
};
