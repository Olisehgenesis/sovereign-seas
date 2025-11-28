module.exports = {
  apps: [
    {
      name: `seasbeta`,
      script: "pnpm",
      args: "start",
      env: {
        PORT: 4173,
        NODE_ENV: 'production',
      },
      env_production: {
        PORT: 4173,
        NODE_ENV: 'production',
      },
    },
  ],
};
