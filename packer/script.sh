#!/bin/bash
export LC_ALL=en_US.UTF-8
# export LC_ALL=en_US.UTF-8
sudo yum update -y
sudo yum upgrade -y
sudo amazon-linux-extras install -y nginx1
sudo amazon-linux-extras install -y epel
# sudo yum remove libuv -y
# sudo yum install libuv --disableplugin=priorities
sudo yum install -y curl
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
sudo yum install -y nodejs
sudo yum install npm
sudo yum install -y mysql
sudo curl -o amazon-cloudwatch-agent.rpm https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U amazon-cloudwatch-agent.rpm
touch config.json
cat <<EOF >> config.json
{
  "agent": {
    "metrics_collection_interval": 10,
    "logfile": "/var/logs/amazon-cloudwatch-agent.log"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/webapp/Logs/app_logs.log",
            "log_group_name": "csye6225",
            "log_stream_name": "webapp"
          }
        ]
      }
    },
    "log_stream_name": "cloudwatch_log_stream"
  },
  "metrics": {
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 15,
        "metrics_aggregation_interval": 15
      }
    }
  }
}
EOF

sudo mv config.json /opt/aws/amazon-cloudwatch-agent/bin/

# sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-5.noarch.rpm
# sudo yum install -y mysql-community-server
# sudo systemctl start mysqld
# sudo systemctl enable mysqld
# passwords=$(sudo grep 'temporary password' /var/log/mysqld.log | awk {'print $13'})
# mysql -u root -p$passwords --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Banish@123';"
# mysql -u root -pBanish@123 -e "create database userDB;"
# echo 'export DB_DATABASE=userDB' >> ~/.bashrc
# echo 'export DB_USER=root' >> ~/.bashrc
# echo 'export DB_PASSWORD=Banish@123' >> ~/.bashrc
# echo 'export DB_HOST=localhost' >> ~/.bashrc
mkdir webapp
mv webapp.zip webapp/
cd webapp
unzip webapp.zip
rm webapp.zip
# rm -r __MACOSX
npm install
cd ..
sudo chmod 755 webapp
# touch webapp.service
# cat <<EOF >> webapp.service
# [Unit]
# Description=app.js - making your environment variables rad
# After=network.target

# [Service]
# Type=simple
# User=ec2-user
# WorkingDirectory=/home/ec2-user/webapp
# ExecStart=/usr/bin/node /home/ec2-user/webapp/server.js
# Environment=DB_DATABASE=userDB
# Environment=DB_USER=root
# Environment=DB_PASSWORD=Banish@123
# Environment=DB_HOST=localhost
# Restart=on-failure

# [Install]
# WantedBy=multi-user.target
# EOF
# sudo mv webapp.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl restart webapp.service
# sudo systemctl enable webapp.service
# sudo systemctl status webapp.service



