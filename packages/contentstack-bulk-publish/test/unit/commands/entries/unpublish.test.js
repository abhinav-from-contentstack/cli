const { describe, it } = require('mocha');
const EntriesUnpublish = require('../../../../src/commands/cm/entries/unpublish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesUnpublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    for (const env of environments) {
      for (const locale of locales) {
        for (const contentType of contentTypes) {
          const args = ['--content-type', contentType, '--environment', env, '--locale', locale, '--alias', process.env.MANAGEMENT_ALIAS, '--delivery-token', process.env.DELIVERY_TOKEN, '--yes'];
          const inquireStub = stub(cliux, 'inquire');
          await EntriesUnpublish.run(args);
          sinon.assert.notCalled(inquireStub);
          inquireStub.restore();
        }
      }
    }
  });
});