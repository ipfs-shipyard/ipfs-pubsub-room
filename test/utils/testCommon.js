'use strict'

const path = require('path')
const fs = !process.browser && require('fs')
const rimraf = !process.browser && require('rimraf')

let dbidx = 0

function location () {
  return path.join(__dirname, '_leveldown_test_db_' + dbidx++)
}

function lastLocation () {
  return path.join(__dirname, '_leveldown_test_db_' + dbidx)
}

function cleanup (callback) {
  if (process.browser) { return callback() }

  fs.readdir(__dirname, function (err, list) {
    if (err) return callback(err)

    list = list.filter(function (f) {
      return (/^_leveldown_test_db_/).test(f)
    })

    if (!list.length) { return callback() }

    let ret = 0

    list.forEach(function (f) {
      rimraf(path.join(__dirname, f), function (err) {
        if (err) {
          callback(err)
          return // early
        }
        if (++ret === list.length) {
          callback()
        }
      })
    })
  })
}

function setUp (t) {
  cleanup(function (err) {
    t.error(err, 'cleanup returned an error')
    t.end()
  })
}

function tearDown (t) {
  setUp(t) // same cleanup!
}

function collectEntries (iterator, callback) {
  const data = []
  const next = function () {
    iterator.next(function (err, key, value) {
      if (err) return callback(err)
      if (!arguments.length) {
        callback(err, data)
      } else {
        data.push({ key: key, value: String(value) })
        setTimeout(next, 0)
      }
    })
  }
  next()
}

module.exports = {
  location: location,
  cleanup: cleanup,
  lastLocation: lastLocation,
  setUp: setUp,
  tearDown: tearDown,
  collectEntries: collectEntries
}
