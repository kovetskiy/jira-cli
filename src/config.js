// Native
import path from 'path';
import fs from 'fs-promise';
import os from 'os';

// Packages
import inquirer from 'inquirer';
import color from 'chalk';

// Local
import jira from './jira';

// Local
export default class Config {
  /**
  * Init config file
  */
  async init(fileName) {
    this.filePath = path.join(os.homedir(), fileName);
    const { filePath } = this;

    // If file doesn't exist then create it
    if (!fs.existsSync(filePath)) {
      this.defaults = await this.createConfigFile(filePath);

      // Exit when the file is created
      process.exit();
    } else {
      this.defaults = await this.loadConfigFile(filePath);
    }

    return this.defaults;
  }

  /**
  * Load config file
  */

  async loadConfigFile(filePath) {
    return fs.readFile(filePath, { encoding: 'utf8' }).then((config) => JSON.parse(config));
  }

  /**
  * Create config file
  */
  async createConfigFile(filePath) {
    const questions = [
      {
        type: ' input',
        name: 'host',
        message: 'Provide your jira host: ',
        default: 'example.atlassian.net',
      },
      {
        type: 'input',
        name: 'username',
        message: 'Please provide your jira username:',
        default: 'example@domain.com',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Enter your jira API token:',
      },
      {
        type: 'confirm',
        name: 'protocol',
        message: 'Enable HTTPS Protocol?',
      },
    ];

    return inquirer.prompt(questions).then((answers) => {
      const protocol = answers.protocol ? 'https' : 'http';

      const config = {
        protocol: protocol.trim(),
        host: answers.host.trim(),
        username: answers.username.trim(),
        password: answers.password.trim(),
        apiVersion: '2',
        strictSSL: true,
      };

      return fs.writeFile(filePath, JSON.stringify(config), 'utf8')
        .then(() => {
          console.log('');
          console.log(`Config file succesfully created in: ${color.green(filePath)}`);
          console.log('');
          return config;
        });
    });
  }

  /**
  * Remove config file
  */
  removeConfigFile() {
    fs.unlinkSync(this.filePath);
    console.log('');
    console.log(color.red('Config file succesfully deleted!'));
    console.log('');
    process.exit();
  }

  /**
  * Update config file
  */
  updateConfigFile() {
    const { filePath } = this;

    fs.writeFile(filePath, JSON.stringify(this.defaults), 'utf8')
      .then(() => {
        console.log('');
        console.log(color.green('  Config file succesfully updated.'));
        console.log('');
      })
      .catch(() => {
        jira.showError('Error updating config file.');
      });
  }

  /**
  * Update config record
  */
  async updateConfigRecord(cmd, val, options) {
    const _this = this;
    const boards = await jira.boards.getBoards();

    if (cmd == 'username') {
      if (typeof val === 'undefined') {
        console.log('');
        console.log(`  Current username: ${color.blue.bold(this.defaults.username)}`);
        console.log('');
      } else {
        this.defaults.username = val;

        this.updateConfigFile();
      }
    } else if (cmd == 'host') {
      if (typeof val === 'undefined') {
        console.log('');
        console.log(`  Current host: ${color.blue.bold(this.defaults.host)}`);
        console.log('');
      } else {
        this.defaults.host = val;

        this.updateConfigFile();
      }
    } else if (cmd == 'password') {
      const questions = [
        {
          type: 'password',
          name: 'password',
          message: 'Type your jira password:',
        },
      ];

      inquirer.prompt(questions).then((passwd) => {
        _this.defaults.password = passwd.password;
        _this.updateConfigFile();
      });
    } else if (cmd == 'board') {
      if (options.set) {
        const question = [
          {
            type: 'list',
            name: 'board',
            message: 'Board: ',
            choices: boards,
            filter(val) {
              return boards.find((obj) => obj.name == val);
            },
          },
        ];

        inquirer.prompt(question)
          .then((res) => {
            _this.defaults.defaultBoard = res.board.id;
            _this.updateConfigFile();
          });
      } else if (typeof this.defaults.defaultBoard === 'undefined') {
        console.log('');
        console.log(color.red('  There is no default board set.'));
      } else if (options.remove) {
        delete this.defaults.defaultBoard;
        this.updateConfigFile();
      } else {
        const defaultBoard = await jira.boards.getBoard(this.defaults.defaultBoard);
        console.log('');
        console.log(`  Your default board is: ${color.green.bold(defaultBoard.name)}`);
      }
    } else if (cmd == 'proxy') {
      if (typeof val === 'undefined') {
        console.log('');
        console.log(`  Current proxy: ${color.blue.bold(this.defaults.proxy ? this.defaults.proxy : 'not defined')}`);
        console.log('');
      } else {
        const proxyVal = val === 'remove' ? undefined : val;

        this.defaults.proxy = proxyVal;

        this.updateConfigFile();
      }
    }
  }

  /**
  * Documentation
  */
  docs() {
    console.log('');
    console.log('  Usage:  config <command>');
    console.log('');
    console.log('');
    console.log('  Commands:');
    console.log('');
    console.log('    remove   Remove the config file');
    console.log('');
  }
}
