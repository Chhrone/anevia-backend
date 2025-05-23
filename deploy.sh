#!/bin/bash

# Anevia Backend Deployment Script for EC2
# This script helps set up and run the Anevia backend on an EC2 instance
# with optional Nginx configuration for reverse proxy

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

# Create required directories if they don't exist
echo "Setting up directories..."
mkdir -p public/images/scans
mkdir -p public/images/conjunctivas
mkdir -p public/images/profiles

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

    read -p "Enter database password: " db_password
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

# Ask if user wants to set up Nginx as a reverse proxy
read -p "Do you want to set up Nginx as a reverse proxy? (y/n): " setup_nginx
if [[ "$setup_nginx" =~ ^[Yy]$ ]]; then
    # Install Nginx if not already installed
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        sudo apt-get install -y nginx || sudo yum install -y nginx
    fi

    # Ask for domain name
    read -p "Enter your domain name (e.g., server.anevia.my.id, leave empty for IP only): " domain_name

    # Ask if SSL should be configured
    read -p "Do you want to set up SSL with Let's Encrypt? (y/n): " setup_ssl

    # Create Nginx configuration
    echo "Creating Nginx configuration..."

    if [[ "$setup_ssl" =~ ^[Yy]$ ]] && [ ! -z "$domain_name" ]; then
        # Install Certbot for Let's Encrypt SSL
        echo "Installing Certbot for Let's Encrypt..."
        sudo apt-get install -y certbot python3-certbot-nginx || sudo yum install -y certbot python3-certbot-nginx

        # Create Nginx config file for SSL
        sudo tee /etc/nginx/sites-available/anevia > /dev/null << EOF
server {
    listen 80;
    server_name $domain_name;

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $domain_name;

    ssl_certificate /etc/letsencrypt/live/$domain_name/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain_name/privkey.pem;

    location / {
        proxy_pass http://localhost:$(grep PORT .env | cut -d '=' -f2);
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Increase max upload size
    client_max_body_size 10M;
}
EOF

        # Create symbolic link to enable the site
        if [ -d "/etc/nginx/sites-enabled" ]; then
            sudo ln -sf /etc/nginx/sites-available/anevia /etc/nginx/sites-enabled/
        fi

        # Obtain SSL certificate
        echo "Obtaining SSL certificate from Let's Encrypt..."
        sudo certbot --nginx -d $domain_name --non-interactive --agree-tos --email admin@$domain_name

    else
        # Create basic Nginx config without SSL
        sudo tee /etc/nginx/sites-available/anevia > /dev/null << EOF
server {
    listen 80;
    server_name ${domain_name:-_};

    location / {
        proxy_pass http://localhost:$(grep PORT .env | cut -d '=' -f2);
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Increase max upload size
    client_max_body_size 10M;
}
EOF

        # Create symbolic link to enable the site
        if [ -d "/etc/nginx/sites-enabled" ]; then
            sudo ln -sf /etc/nginx/sites-available/anevia /etc/nginx/sites-enabled/
        fi
    fi

    # Test Nginx configuration
    echo "Testing Nginx configuration..."
    sudo nginx -t

    # Restart Nginx
    echo "Restarting Nginx..."
    sudo systemctl restart nginx

    # Enable Nginx to start on boot
    echo "Enabling Nginx to start on boot..."
    sudo systemctl enable nginx
fi

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 start server.js --name "anevia-backend"

# Save PM2 configuration to restart on server reboot
echo "Setting up PM2 to start on system boot..."
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "===== Deployment Complete ====="
echo "The Anevia backend is now running on port $(grep PORT .env | cut -d '=' -f2)"

if [[ "$setup_nginx" =~ ^[Yy]$ ]]; then
    if [[ "$setup_ssl" =~ ^[Yy]$ ]] && [ ! -z "$domain_name" ]; then
        echo "Your application is accessible at: https://$domain_name"
    elif [ ! -z "$domain_name" ]; then
        echo "Your application is accessible at: http://$domain_name"
    else
        echo "Your application is accessible at: http://your-server-ip"
    fi
    echo "Nginx is configured as a reverse proxy"
else
    echo "Your application is accessible at: http://your-server-ip:$(grep PORT .env | cut -d '=' -f2)"
fi

echo "To check application status, run: pm2 status"
echo "To view logs, run: pm2 logs anevia-backend"
