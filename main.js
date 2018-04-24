'use strict'



const sessionsMiddleware = require('@arangodb/foxx/sessions')
const sessions = sessionsMiddleware({
  storage: module.context.collection('sessions'),
  transport: 'cookie'
})
module.context.use(sessions)

module.context.use('/auth', require('./routes/auth'), 'auth');
module.context.use('/users', require('./routes/users'), 'users')
module.context.use('/sessions', require('./routes/sessions'), 'sessions')
module.context.use('/messages', require('./routes/messages'), 'messages')
module.context.use('/companies', require('./routes/companies'), 'companies')
module.context.use('/hasperm', require('./routes/hasperm'), 'hasperm')
module.context.use('/memberof', require('./routes/memberof'), 'memberof')


const users = module.context.collection('users');
module.context.use(function (req, res, next) {
  if (req.session.uid) {
    try {
      req.user = users.document(req.session.uid)
    } catch (e) {
      req.session.uid = null;
      req.sessionStorage.save();
    }
  }
  next();
});