#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('❌ VERCEL_TOKEN или VERCEL_PROJECT_ID не заданы');
  process.exit(1);
}

async function canaryDeploy() {
  const percentage = parseInt(process.argv[2], 10) || 10;

  if (percentage < 0 || percentage > 100) {
    console.error('❌ Процент должен быть от 0 до 100');
    process.exit(1);
  }

  try {
    console.log(`🔍 Получение информации о деплоях...`);

    const headers = {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    };

    let url = `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=2`;
    if (VERCEL_TEAM_ID) {
      url += `&teamId=${VERCEL_TEAM_ID}`;
    }

    const deploymentsResponse = await axios.get(url, { headers });

    if (
      !deploymentsResponse.data.deployments ||
      deploymentsResponse.data.deployments.length < 2
    ) {
      console.error('❌ Недостаточно деплоев для canary релиза');
      return;
    }

    const [newDeployment, stableDeployment] = deploymentsResponse.data.deployments;

    console.log(
      `🚀 Настройка трафика: ${percentage}% на новую версию, ${100 - percentage}% на стабильную...`
    );

    const trafficUrl = `https://api.vercel.com/v2/deployments/${VERCEL_PROJECT_ID}/traffic`;
    const trafficData = {
      deployments: {
        [newDeployment.id]: percentage,
        [stableDeployment.id]: 100 - percentage,
      },
    };

    if (VERCEL_TEAM_ID) {
      trafficData.teamId = VERCEL_TEAM_ID;
    }

    const trafficResponse = await axios.post(trafficUrl, trafficData, { headers });

    if (trafficResponse.status === 200) {
      console.log(`✅ Трафик настроен успешно!`);
      console.log(`🆕 Новая версия (${newDeployment.id}): ${percentage}%`);
      console.log(`🛡️ Стабильная версия (${stableDeployment.id}): ${100 - percentage}%`);
    } else {
      console.error('❌ Ошибка настройки трафика:', trafficResponse.data);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    process.exit(1);
  }
}

canaryDeploy();
