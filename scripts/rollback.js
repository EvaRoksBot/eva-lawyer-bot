#!/usr/bin/env node

const { execSync } = require('child_process');
const axios = require('axios');
require('dotenv').config();

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT = process.env.VERCEL_PROJECT;
const VERCEL_TEAM = process.env.VERCEL_TEAM;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

async function notifyAdmin(message) {
  if (TELEGRAM_BOT_TOKEN && ADMIN_CHAT_ID) {
    try {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: ADMIN_CHAT_ID,
          text: `🔄 ROLLBACK: ${message}`,
          parse_mode: 'Markdown',
        }
      );
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    }
  }
}

async function rollbackToVersion() {
  try {
    const targetVersion = process.argv[2] || '';

    if (!targetVersion) {
      console.log('No version specified, listing recent successful deployments...');
      const deploymentsCmd = execSync('vercel ls --production').toString();
      console.log(deploymentsCmd);
      return;
    }

    console.log(`Rolling back to ${targetVersion}...`);

    if (VERCEL_TOKEN && VERCEL_PROJECT) {
      const headers = { Authorization: `Bearer ${VERCEL_TOKEN}` };
      const url = `https://api.vercel.com/v1/projects/${VERCEL_PROJECT}/deployments/${targetVersion}/rollback`;

      console.log(`Requesting rollback via Vercel API...`);
      const rollbackResponse = await axios.post(
        url,
        { teamId: VERCEL_TEAM },
        { headers }
      );

      if (rollbackResponse.status >= 200 && rollbackResponse.status < 300) {
        console.log('Rollback initiated successfully');
        await notifyAdmin(`Успешно выполнен откат к версии \`${targetVersion}\``);
      } else {
        throw new Error(`Vercel API returned ${rollbackResponse.status}`);
      }
    } else {
      console.log('VERCEL_TOKEN or VERCEL_PROJECT not set, using git for rollback');
      execSync(`git checkout ${targetVersion}`);
      execSync('git push origin HEAD:main --force');
      await notifyAdmin(`Успешно выполнен откат к версии \`${targetVersion}\` через git force-push`);
    }
  } catch (error) {
    console.error('Rollback failed:', error.message);
    await notifyAdmin(`❌ Ошибка отката: ${error.message}`);
    process.exit(1);
  }
}

rollbackToVersion();
