const axios = require('axios');

const API_KEY = process.env.FUB_API_KEY;
const BASE_URL = process.env.FUB_API_BASE_URL || 'https://api.followupboss.com/v1';

// Create axios instance with auth
const fubClient = axios.create({
  baseURL: BASE_URL,
  auth: {
    username: API_KEY,
    password: ''
  },
  headers: {
    'Content-Type': 'application/json',
    'X-System': 'FUBAnalytics',
    'X-System-Key': 'fub-analytics-dashboard'
  }
});

// Helper to fetch all pages of results - increased max pages
async function fetchAllPages(endpoint, params = {}, maxPages = 50) {
  const allResults = [];
  let offset = 0;
  const limit = 100;
  let pageCount = 0;

  while (pageCount < maxPages) {
    try {
      const response = await fubClient.get(endpoint, {
        params: { ...params, limit, offset }
      });

      const data = response.data;
      const items = data[Object.keys(data).find(k => Array.isArray(data[k]))] || [];

      if (items.length === 0) break;

      allResults.push(...items);
      console.log(`${endpoint}: fetched ${allResults.length} items so far...`);

      if (items.length < limit) break;

      offset += limit;
      pageCount++;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error.message);
      break;
    }
  }

  console.log(`${endpoint}: total ${allResults.length} items`);
  return allResults;
}

// Get all users (agents) - with pagination
async function getUsers() {
  try {
    const allUsers = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await fubClient.get('/users', {
        params: { limit, offset }
      });
      const users = response.data.users || [];

      if (users.length === 0) break;

      allUsers.push(...users);
      console.log(`Fetched ${allUsers.length} users so far...`);

      if (users.length < limit) break;
      offset += limit;
    }

    console.log(`Total users fetched: ${allUsers.length}`);
    return allUsers;
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return [];
  }
}

// Get appointments with date range
async function getAppointments(startDate, endDate, userId = null) {
  const params = {
    start: startDate,
    end: endDate
  };
  if (userId) params.userId = userId;

  return fetchAllPages('/appointments', params);
}

// Get calls (notes with type call)
async function getCalls(startDate, endDate, userId = null) {
  const params = {};
  if (userId) params.userId = userId;

  // Calls are logged as activity in FUB
  const calls = await fetchAllPages('/calls', params);

  // Filter by date range
  const start = new Date(startDate);
  const end = new Date(endDate);

  return calls.filter(call => {
    const callDate = new Date(call.created);
    return callDate >= start && callDate <= end;
  });
}

// Get deals (for contracts and closings)
async function getDeals(pipelineId = null, userId = null) {
  const params = {};
  if (pipelineId) params.pipelineId = pipelineId;
  if (userId) params.userId = userId;

  return fetchAllPages('/deals', params);
}

// Get pipelines (to identify which is for listings vs buyers)
async function getPipelines() {
  try {
    const response = await fubClient.get('/pipelines');
    return response.data.pipelines || [];
  } catch (error) {
    console.error('Error fetching pipelines:', error.message);
    return [];
  }
}

// Get stages for a pipeline
async function getStages(pipelineId) {
  try {
    const response = await fubClient.get('/stages', {
      params: { pipelineId }
    });
    return response.data.stages || [];
  } catch (error) {
    console.error('Error fetching stages:', error.message);
    return [];
  }
}

// Get appointment types
async function getAppointmentTypes() {
  try {
    const response = await fubClient.get('/appointmentTypes');
    return response.data.appointmentTypes || [];
  } catch (error) {
    console.error('Error fetching appointment types:', error.message);
    return [];
  }
}

// Get appointment outcomes
async function getAppointmentOutcomes() {
  try {
    const response = await fubClient.get('/appointmentOutcomes');
    return response.data.appointmentOutcomes || [];
  } catch (error) {
    console.error('Error fetching appointment outcomes:', error.message);
    return [];
  }
}

module.exports = {
  fubClient,
  getUsers,
  getAppointments,
  getCalls,
  getDeals,
  getPipelines,
  getStages,
  getAppointmentTypes,
  getAppointmentOutcomes,
  fetchAllPages
};
