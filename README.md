# Chat v2
A simple discord clone made using nodejs and electron

![exmaple](./assets/example.png)

## Todo

- [x] Store user info in local JSON data
- [x] Admin commands
- [x] Ban users
- [x] AI

## Setup

### Install
Run `npm i` to install all the dependencies.

### Config File
Create a file called "config.json" in the root directory, an example is located in "example.config.json".

### Local data
The app loads its initial data from `public/data.json` and stores local changes in the browser's `localStorage`.

### Create User
Run `npm run create-user` to add a user to `public/data.json`.

### Create Server
Run `npm run create-server` to create a server, this will give you a wizard to create a server.

## Usage

### Start
Run `npm start` to start the application for development.

### Build
Run `npm build` to build the application for production.
