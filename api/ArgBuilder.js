const { ArgumentTypeError, ArgumentParser} = require('argparse');
const { version, description } = require('../package.json');
const process = require('process');
class ArgBuilder {

    /**
     * Build arguments using argparse and validate them.
     * @param {ArgumentParser} argumentParser 
     */
    constructor(argumentParser) {
        this.argumentParser = argumentParser;
        this.buildArguments();
        this.args = this.argumentParser.parse_args();
        this.checkConstraints();
    }

    buildArguments() {
        this.argumentParser.add_argument('-v', '--version', {
            help: 'Display the version',
            action: 'version', version
        });

        this.argumentParser.add_argument('-p', '--port', {
            help: 'The port on which the API should be hosted.',
            default: 80,
            required: false
        });
    }

    checkConstraints() {
        if(typeof(this.args['port']) != 'number') {
            console.error('Argument \'port\' needs to be a number.');
            process.exit(1)
        }

        if(typeof(this.args['port']) > 65535 || typeof(this.args['port']) < 1) {
            console.error('Argument \'port\' needs to be > 1 and < 65535.');
            process.exit(1)
        }
    }

    getArgs() {
        return this.args;
    }
}

module.exports = {
    ArgBuilder: ArgBuilder
}