'use strict'
const dd = require('dedent')
const joi = require('joi')
const httpError = require('http-errors')
const status = require('statuses')
const errors = require('@arangodb').errors
const createRouter = require('@arangodb/foxx/router')
const Company = require('../models/company')

const companies = module.context.collection('companies')
const keySchema = joi.string().required()
.description('The key of the company')

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code
const HTTP_NOT_FOUND = status('not found')
const HTTP_CONFLICT = status('conflict')

const router = createRouter()
module.exports = router

router.tag('company')

router.get(function (req, res) {
  res.send(companies.all())
}, 'list')
.response([Company], 'A list of companies.')
.summary('List all companies')
.description(dd`
  Retrieves a list of all companies.
`)

router.post(function (req, res) {
  const company = req.body
  let meta
  try {
    meta = companies.save(company)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message)
    }
    throw e
  }
  Object.assign(company, meta)
  res.status(201)
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: company._key})
  ))
  res.send(company)
}, 'create')
.body(Company, 'The company to create.')
.response(201, Company, 'The created company.')
.error(HTTP_CONFLICT, 'The company already exists.')
.summary('Create a new company')
.description(dd`
  Creates a new company from the request body and
  returns the saved document.
`)

router.get(':key', function (req, res) {
  const key = req.pathParams.key
  let company
  try {
    company = companies.document(key)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    throw e
  }
  res.send(company)
}, 'detail')
.pathParam('key', keySchema)
.response(Company, 'The company.')
.summary('Fetch a company')
.description(dd`
  Retrieves a company by its key.
`)

router.put(':key', function (req, res) {
  const key = req.pathParams.key
  const company = req.body
  let meta
  try {
    meta = companies.replace(key, company)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message)
    }
    throw e
  }
  Object.assign(company, meta)
  res.send(company)
}, 'replace')
.pathParam('key', keySchema)
.body(Company, 'The data to replace the company with.')
.response(Company, 'The new company.')
.summary('Replace a company')
.description(dd`
  Replaces an existing company with the request body and
  returns the new document.
`)

router.patch(':key', function (req, res) {
  const key = req.pathParams.key
  const patchData = req.body
  let company
  try {
    companies.update(key, patchData)
    company = companies.document(key)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message)
    }
    throw e
  }
  res.send(company)
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the company with.'))
.response(Company, 'The updated company.')
.summary('Update a company')
.description(dd`
  Patches a company with the request body and
  returns the updated document.
`)

router.delete(':key', function (req, res) {
  const key = req.pathParams.key
  try {
    companies.remove(key)
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message)
    }
    throw e
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a company')
.description(dd`
  Deletes a company from the database.
`)
