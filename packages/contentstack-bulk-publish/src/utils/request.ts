/* eslint-disable node/no-extraneous-require */
/* eslint-disable no-mixed-operators */
/* eslint-disable max-statements-per-line */
/* eslint-disable no-multi-assign */
// import * as Bluebird from 'bluebird'
const request = require('axios')
const debug = require('debug')('requests')

const MAX_RETRY_LIMIT = 8

export default async function makeCall (req, RETRY?): Promise<any | Error> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof RETRY !== 'number') {
        RETRY = 1
      } else if (RETRY > MAX_RETRY_LIMIT) {
        return reject(new Error('Max retry limit exceeded!'))
      }
      if (!req.headers) {
        req.headers = {}
      }
      req.headers['X-User-Agent'] = 'bulk-publish-entries-assets/v3'
      return request(req).then(response => {
        let timeDelay
        if (response.status >= 200 && response.status <= 399) {
          return resolve(JSON.parse(response.data))
        } if (response.status === 429) {
          // eslint-disable-next-line no-mixed-operators
          timeDelay = Math.SQRT2 ** RETRY * 100
          debug(`API rate limit exceeded.\nReceived ${response.status} status\nBody ${JSON.stringify(response)}`)
          debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`)
          return setTimeout((req, RETRY) => makeCall(req, RETRY)
          .then(resolve)
          .catch(reject), timeDelay, req, RETRY)
        } if (response.status >= 500) {
          // retry, with delay
          timeDelay = Math.SQRT2 ** RETRY * 100
          debug(`Recevied ${response.status} status\nBody ${JSON.stringify(response)}`)
          debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`)
          RETRY++
          return setTimeout((req, RETRY) => makeCall(req, RETRY)
          .then(resolve)
          .catch(reject), timeDelay, req, RETRY)
        }
        debug(`Request failed\n${JSON.stringify(req)}`)
        debug(`Response received\n${JSON.stringify(response)}`)
        return reject(response.body)
      }).catch(reject)
    } catch (error) {
      debug(error)
      return reject(error)
    }
  })
}
