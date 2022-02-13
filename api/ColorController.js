const { ApiController } = require('./ApiController');
const { DeviceController } = require('./DeviceController');
const { Control } = require('magic-home');

const fs = require('fs');
const express = require('express');
const _ = require('underscore');
const path = require('path');
class ColorController extends ApiController {

    static DEFAULT_COLOR = Object.freeze({
        red : 255,
        green : 255,
        blue : 255,
        on: true
    });

    /**
     * Instantiate a ColorController.
     * @param {*} deviceController the device controller
     * @param {*} serializationPath the serialization path
     * @param {*} colorObj the color object
     */
    constructor(serializationPath, deviceController, colorObj = {...ColorController.DEFAULT_COLOR}) {
        super();
        this.serializationPath = serializationPath; // path.join(__dirname, serializationPath);
        this.deviceController = deviceController;
        this.color = colorObj;
        this.normalize();
        this.serialize();
    }

    /**
     * Change the value of the color object.
     * @param {express.Request} req the request
     * @param {express.Response} res the response
     */
    set(req, res) {
        // Filter 'on' because 'on' is controlled by PUT and DELETE requests
        let options = _.pick(req.body, ...Object.keys(ColorController.DEFAULT_COLOR).filter(e => e !== 'on'));
        if(Object.keys(options).length == 0) {
            res.status(400).send(this.response({
                message: 'Malformed request. Did not get any parameters.',
                status: 'failed'
            }));
            return;
        }
        let completed = this.setRGB(options);

        let message = completed.length == 0 ? 'No value change' : 'Succesfully changed the color';

        res.status(200).send(this.response({
            message: message,
            updated: completed,
            status: 'completed'
        }));
        this.serialize();
        this.send();
    }

    /**
     * Return the color object to the client.
     * @param {express.Request} req the request
     * @param {express.Response} res the response
     */
    get(req, res) {
        res.status(200).send(JSON.stringify(this.getObject()));
    }

    /**
     * Get the color object.
     * @returns {Object} the color object. 
     */
    getObject() {
        return this.color;
    }

    /**
     * Change the value of the color object.
     * @param {Object} options the color object
     * @param {Number} options.red the red value
     * @param {Number} options.green the green value
     * @param {Number} options.blue the blue value
     * @param {Boolean} options.on whether the device is on
     * @returns {Array} array of which options have been updated
     */
    setRGB(options) {
        let changed = [];
        options = _.pick(options, ...Object.keys(ColorController.DEFAULT_COLOR));
        Object.keys(options).forEach(key => {
            if(key == 'on') {
                try {
                    if(!_.isBoolean(JSON.parse(options[key]))) {
                        delete options[key];
                        return;
                    }
                    let color = JSON.parse(options[key]);
                    
                    if(this.color[key] != color) changed.push(key);

                    this.color[key] = JSON.parse(options[key]);
                    return;
                } catch {
                    delete options[key];
                    return;
                }
            }

            if(isNaN(options[key])) {
                delete options[key];
                return;
            }

            let color = ColorController.val(parseInt(options[key]));
            if(this.color[key] != color) changed.push(key);
            this.color[key] = color;
        });
        return changed;
    }

    off(req, res) {
        let changed = this.setRGB({
            'on': false
        });
        res.status(200).send(this.response({
            message: 'Turned lights off',
            updated: changed,
            status: 'completed'
        }));
        this.serialize();
        this.send();
    }

    on(req, res) {
        let changed = this.setRGB({
            'on': true
        });
        res.status(200).send(this.response({
            message: 'Turned lights on',
            updated: changed,
            status: 'completed'
        }));
        this.serialize();
        this.send();
    }

    /**
     * Send the color object to all peers.
     * @param {Object} colorObj 
     */
    send(colorObj=this.color) {
        let activeDevices = this.deviceController.getActiveList();
        console.log('Setting color', colorObj);
        activeDevices.forEach(obj => {
            try {
                let device = new Control(obj['address'], {
                    wait_for_reply: true,
                    connect_timeout: 1500
                });
                console.log(colorObj['on']);
                device.setPower(colorObj['on']);
                if(colorObj['on']) {
                    device.setColor(colorObj['red'], colorObj['green'], colorObj['blue']);
                } else {
                    device.setColor(0, 0, 0);
                }
            } catch(e) {
                console.error('Could not send color:', e);
            }

        });
    }

    /**
     * Checks the validity of the color object and resets it if a corrupted object is detected.
     */
    check(obj=this.color) {
        // Checks for missing keys
        if(!this.compareObject(ColorController.DEFAULT_COLOR, obj)) {
            console.error('The color object has been corrupted. Resetting to default. . .');
            obj = ColorController.DEFAULT_COLOR;
        }
    }

    /**
     * Sets the color object to a color object with validated RGB values.
     */
    normalize(obj=this.color) {
        let obj_ck = _.pick(obj, ...Object.keys(ColorController.DEFAULT_COLOR));
        this.check(obj_ck);
        Object.keys(obj_ck).forEach(key => {
            if(typeof(obj_ck[key]) != typeof(ColorController.DEFAULT_COLOR[key])) {
                obj_ck[key] = ColorController.DEFAULT_COLOR[key];
            }
        });
    }

    /**
     * Serialize the color object to the constructed path.
     */
    serialize() {
        if(!fs.existsSync(path.dirname(this.serializationPath))) {
            fs.mkdirSync(path.dirname(this.serializationPath));
        }

        fs.writeFileSync(this.serializationPath, btoa(JSON.stringify(this.color)), {
            flag: 'w',
            encoding: 'utf-8'
        });
    }

    /**
     * Check the validity of RGB values.
     * @param {Number} value 
     * @returns 0 if the value is < 0, 255 if the value > 255
     */
    static val(value) {
        return Math.max(0, Math.min(value, 255));
    }

    /**
     * Returns the deserialized file instance of the ColorController.
     * @param {String} path path of the serialized object 
     * @returns {ColorController} the deserialized ColorController object.
     */
    static serialized(serializationPath, deviceController) {
        let colorObj = JSON.parse(atob(fs.readFileSync(serializationPath, 'utf-8')));
        console.log('Deserialized \'colorObj\'', colorObj);
        return new ColorController(serializationPath, deviceController, colorObj);
    }

    /**
     * Creates a new object if none are serialized.
     * @param {String} path path of the serialized object
     * @returns {ColorController} the deserialized ColorController object or a new ColorController instance.
     */
    static create(serializationPath, deviceController) {
        let absolute = path.join(__dirname, serializationPath);
        if(fs.existsSync(absolute)) {
            return this.serialized(absolute, deviceController);
        } else {
            return new ColorController(serializationPath, deviceController);
        }
    }
}

module.exports = {
    ColorController: ColorController
}