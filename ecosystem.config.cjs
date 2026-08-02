module.exports = {
  apps: [
    {
      name: "attd",
      script: "npx",
      args: "next start -p 4000",
      cwd: "/home/user/attd",
      env: { NODE_ENV: "production", PORT: 4000 },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
