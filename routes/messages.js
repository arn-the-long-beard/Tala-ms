'use strict'
const dd = require('dedent')
const joi = require('joi')
const httpError = require('http-errors')
const status = require('statuses')
const errors = require('@arangodb').errors
const createRouter = require('@arangodb/foxx/router')
const Message = require('../models/message')

const messages = module.context.collection('messages')
const keySchema = joi.string().required()
.description('The key of the message')

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code
const HTTP_NOT_FOUND = status('not found')
const HTTP_CONFLICT = status('conflict')

const router = createRouter()
module.exports = router

router.tag('message')

router.get(function (req, res) {
  res.send(messages.all())
}, 'list')
.response([Message], 'A list of messages.')
.summary('List all messages')
.description(dd`
  Retrieves a list of all messages.
`)

router.post(function (req, res) {
  const message = req.body
  let meta
  try {
    meta = messages.save(message)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message)
    }
    throw e
  }
  Object.assign(message, meta)
  res.status(201)
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: message._key})
  ))
  res.send(message)
}, 'create')
.body(Message, 'The message to create.')
.response(201, Message, 'The created message.')
.error(HTTP_CONFLICT, 'The message already exists.')
.summary('Create a new message')
.description(dd`
  Creates a new message from the request body and
  returns the saved document.
`)

router.get(':key', function (req, res) {
  const key = req.pathParams.key
  let message
  try {
    message = messages.document(key)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    throw e
  }
  res.send(message)
}, 'detail')
.pathParam('key', keySchema)
.response(Message, 'The message.')
.summary('Fetch a message')
.description(dd`
  Retrieves a message by its key.
`)

router.put(':key', function (req, res) {
  const key = req.pathParams.key
  const message = req.body
  let meta
  try {
    meta = messages.replace(key, message)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message)
    }
    throw e
  }
  Object.assign(message, meta)
  res.send(message)
}, 'replace')
.pathParam('key', keySchema)
.body(Message, 'The data to replace the message with.')
.response(Message, 'The new message.')
.summary('Replace a message')
.description(dd`
  Replaces an existing message with the request body and
  returns the new document.
`)

router.patch(':key', function (req, res) {
  const key = req.pathParams.key
  const patchData = req.body
  let message
  try {
    messages.update(key, patchData)
    message = messages.document(key)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message)
    }
    throw e
  }
  res.send(message)
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the message with.'))
.response(Message, 'The updated message.')
.summary('Update a message')
.description(dd`
  Patches a message with the request body and
  returns the updated document.
`)

router.delete(':key', function (req, res) {
  const key = req.pathParams.key
  try {
    messages.remove(key)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    throw e
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a message')
.description(dd`
  Deletes a message from the database.
`)
