// const {Command, flags} = require('@oclif/command')
const {Command, flags} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
let _ = require('lodash')
const Configstore  = require('configstore')
const credStore = new Configstore('contentstack_cli')
const {configWithMToken,
  parameterWithMToken,
  withoutParameterMToken,
  configWithAuthToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken
} = require('../../lib/util/import-flags')

class ImportCommand extends Command {
  async run() {
    const {flags} = this.parse(ImportCommand)
    const extConfig = flags.config
    let targetStack = flags['stack-uid']
    const data = flags.data
    const moduleName = flags.module
    const backupdir = flags["backup-dir"]
    const alias = flags['management-token-alias']
    const authToken = flags['auth-token']
    let _authToken = credStore.get('authtoken')
    let host = this.config.userConfig.getRegion()

    let cmaHost = host.cma.split('//')
    let cdaHost = host.cda.split('//')
    host.cma = cmaHost[1]
    host.cda = cdaHost[1]
    if (alias && alias !== undefined) {
      let managementTokens = this.getToken(alias)

      if (managementTokens && managementTokens !== undefined) {
        if (extConfig && extConfig !== undefined && _authToken) {
          configWithMToken(
            extConfig,
            managementTokens,
            moduleName,
            host,
            _authToken
          )
        } else if (data) {
          parameterWithMToken(
            managementTokens,
            data,
            moduleName,
            host,
            _authToken
          )
        } else {
          withoutParameterMToken(
            managementTokens,
            moduleName,
            host,
            _authToken
          )
        } 
      } else {
        this.log('management Token is not present please add managment token first')
      }
    } else if (authToken && authToken !== undefined && _authToken && _authToken !== undefined) {
      if (extConfig && extConfig !== undefined) {
        configWithAuthToken(
          extConfig,
          _authToken,
          moduleName,
          host
        )
      } else if (targetStack && data) {
        parametersWithAuthToken(
          _authToken,
          targetStack,
          data,
          moduleName,
          host,
          backupdir
        )
      } else {
        withoutParametersWithAuthToken(
          _authToken,
          moduleName,
          host,
          backupdir
        )
      }
    } else  {
      this.log('Provide alias for managementToken or authtoken')
    }
  }
}

ImportCommand.description = `Import script for importing the content into new stack
...
Once you export content from the source stack, import it to your destination stack by using the cm:import command.
`
ImportCommand.examples = [
  `csdx cm:import -A`, 
  `csdx cm:import -A -s <stack_ApiKey> -d <path/of/export/destination/dir>`,
  `csdx cm:import -A -c <path/of/config/dir>`,
  `csdx cm:import -a <management_token_alias>`,
  `csdx cm:import -a <management_token_alias> -d <path/of/export/destination/dir>`,
  `csdx cm:import -a <management_token_alias> -c <path/of/config/file>`,
  `csdx cm:import -A -m <single module name>`,
]
ImportCommand.flags = {
  config: flags.string({char: 'c', description: '[optional] path of config file'}),
  'stack-uid': flags.string({char: 's', description: 'API key of the target stack'}),
  data: flags.string({char: 'd', description: 'path and location where data is stored'}),
  'management-token-alias': flags.string({char: 'a', description: 'alias of the management token'}),
  'auth-token': flags.boolean({char: 'A', description: 'to use auth token'}),
  module: flags.string({char: 'm', description: '[optional] specific module name'}),
  "backup-dir": flags.string({char: 'b', description: '[optional] backup directory name when using specific module'})
}

module.exports = ImportCommand
