const { ApiController } = require('./ApiController');

class SettingsController extends ApiController {
    static checkAuth(pass) {
        // Todo: validate password
        return pass == 1234;
    }

    static authNeeded() {
        // Todo: check if auth is needed
        return true;
    }
}

module.exports = {
    SettingsController: SettingsController
}