![GitHub package.json version](https://img.shields.io/github/package-json/v/jackwellerreal/chat?style=for-the-badge)
![GitHub licence](https://img.shields.io/github/license/jackwellerreal/chat?style=for-the-badge)
![GitHub stars](https://img.shields.io/github/stars/jackwellerreal/chat?style=for-the-badge)

# Chat v2
A simple discord clone made using nodejs and electron

![exmaple](./assets/example.png)

## Todo

- [x] Store user info in firebase
- [x] Admin commands
- [x] Ban users
- [x] AI

## Setup

### Install
Run `npm i` to install all the dependencies.

### Config File
Create a file called "config.json" in the root directory, an example is located in "example.config.json".

### Firebase Setup
Run `npm run initialize-firebase` to setup firebase, this will give you a wizard to setup firebase with the correct settings.

### Create User
Run `npm run create-user` to create a user, this will give you a wizard to create a user.

### Create Server
Run `npm run create-server` to create a server, this will give you a wizard to create a server.

## Usage

### Start
Run `npm start` to start the application for development.

### Build
Run `npm build` to build the application for production.
