#!/bin/bash

# Anevia Backend Deployment Script for EC2
# This script helps set up and run the Anevia backend on an EC2 instance

# Make script exit on any error
set -e

echo "===== Anevia Backend Deployment ====="

# Update system packages
echo "Updating system packages..."
sudo apt-get update -y || sudo yum update -y

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs || sudo yum install -y nodejs
fi

# Check Node.js version
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install PM2 globally for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# Create images directory if it doesn't exist
echo "Setting up directories..."
mkdir -p images/scans

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env

    echo "===== DATABASE CONNECTION CONFIGURATION ====="
    echo "IMPORTANT: This script assumes your PostgreSQL database already exists on EC2."
    echo "It will NOT create or modify your database schema, only configure the connection."
    echo "Make sure to enter the correct credentials for your existing database."
    echo "=================================================================="

    # Prompt for environment variables
    read -p "Enter database host (default: localhost): " db_host
    db_host=${db_host:-localhost}

    read -p "Enter database user: " db_user
    if [ -z "$db_user" ]; then
        echo "Database user cannot be empty"
        exit 1
    fi

    read -s -p "Enter database password: " db_password
    echo
    if [ -z "$db_password" ]; then
        echo "Database password cannot be empty"
        exit 1
    fi

    read -p "Enter database name: " db_name
    if [ -z "$db_name" ]; then
        echo "Database name cannot be empty"
        exit 1
    fi

    read -p "Enter database port (default: 5432): " db_port
    db_port=${db_port:-5432}

    read -p "Enter server port (default: 5000): " port
    port=${port:-5000}

    # Update .env file with provided values
    sed -i "s/PORT=.*/PORT=$port/" .env
    sed -i "s/HOST=.*/HOST=0.0.0.0/" .env
    sed -i "s/DB_USER=.*/DB_USER=$db_user/" .env
    sed -i "s/DB_HOST=.*/DB_HOST=$db_host/" .env
    sed -i "s/DB_NAME=.*/DB_NAME=$db_name/" .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
    sed -i "s/DB_PORT=.*/DB_PORT=$db_port/" .env
fi

# Test database connection before starting the application
echo "Testing database connection..."
node -e "
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
    process.exit(1);
  } else {
    console.log('Database connected successfully');
    pool.end();
  }
});
"

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 start server.js --name "anevia-backend"

# Save PM2 configuration to restart on server reboot
echo "Setting up PM2 to start on system boot..."
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "===== Deployment Complete ====="
echo "The Anevia backend is now running on port $(grep PORT .env | cut -d '=' -f2)"
echo "To check application status, run: pm2 status"
echo "To view logs, run: pm2 logs anevia-backend"
