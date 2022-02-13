const { ApiController } = require('./ApiController');
const { Discovery } = require('magic-home');
const _ = require('underscore');
const path = require('path');
const fs = require('fs');
class DeviceController extends ApiController {

    discoveryAvailable = false;

    constructor(serializationPath, activeDevices=[]) {
        super();

        this.availableDevices = [];
        this.activeDevices = [];
        this.serializationPath = serializationPath;

        this.deviceUpdateInterval = setInterval(async () => {
            await this.updateList();
        }, 2000);
       
    }

    serialize() {
        if(!fs.existsSync(path.dirname(this.serializationPath))) {
            fs.mkdirSync(path.dirname(this.serializationPath));
        }

        fs.writeFileSync(this.serializationPath, btoa(JSON.stringify(this.activeDevices)), {
            flag: 'w',
            encoding: 'utf-8'
        }); 
    }

    static serialized(serializationPath) {
        let deviceArray = JSON.parse(atob(fs.readFileSync(serializationPath, 'utf-8')));
        console.log('Deserialized \'deviceArray\'', deviceArray);
        return new DeviceController(serializationPath, deviceArray);
    }

    static create(serializationPath) {
        let absolute = path.join(__dirname, serializationPath);
        if(fs.existsSync(absolute)) {
            return this.serialized(absolute);
        } else {
            return new DeviceController(serializationPath);
        }
    }

    getActiveList() {
        let available = this.activeDevices.length == 0 ? this.availableDevices : this.activeDevices;
        console.log('Available:', available);
        return available;
    }

    async updateList() {
        let devices = [];
        let discovery = new Discovery();

        try {
            await discovery.scan(500);
        } catch {
            console.error('Could not update devices.');
        }

        devices = [...new Set(discovery.clients)];

        this.availableDevices = devices.length == 0 ? this.availableDevices : devices;
    }

    getList() {
        return this.availableDevices;
    }

    removeElement(ip) {
        let obtainableDevices = this.getList();
        let isFound = false;
        obtainableDevices.forEach(obj => {
            if(obj['address'] == ip) {
                isFound = true;
                this.activeDevices.filter(obj => obj['address'] != ip);
            }
        });
        this.serialize();
        return isFound;
    }

    addElement(ip) {
        let obtainableDevices = this.getList();
        obtainableDevices.forEach(obj => {
            if(obj['address'] == ip) {
                isFound = true;
                this.activeDevices.push(obj);
            }
        });
        this.serialize();
        return isFound;
    }
    
    /**
     * Return the list of devices to the client.
     * @param {express.Request} req the request
     * @param {express.Response} res the response
     */
    async list(req, res) {
        res.status(200).send(JSON.stringify(this.getActiveList()));
    }

    async available(req, res) {
        res.status(200).send(JSON.stringify(this.getList()));
    }

    async remove(req, res) {
        let hasBeenDeleted = await this.removeElement(req.body.ip);
        if(hasBeenDeleted) {
            res.status(400).send(this.response({
                message: `'${req.body.ip}' could not be deleted because the address was not found.`,
                status: 'failed'
            }));
        } else {
            res.status(200).send(this.response({
                message: `'${req.body.ip}' has been removed from the device list.`,
                status: 'completed'
            }));
        }
    }

    async add(req, res) {
        let hasBeenAdded = await this.addElement(req.body.ip);
        if(hasBeenAdded) {
            res.status(400).send(this.response({
                message: `'${req.body.ip}' could not be added because the address was not found.`,
                status: 'failed'
            }));
        } else {
            res.status(200).send(this.response({
                message: `'${req.body.ip}' has been added to the device list.`,
                status: 'completed'
            }));
        }
    }
}

module.exports = {
    DeviceController: DeviceController
}