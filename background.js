// ========================================
// ASANA API CONFIGURATION
// ========================================

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
const ASANA_OAUTH_URL = 'https://app.asana.com/-/oauth_authorize';
const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';

// NOTE: You need to register your extension at https://app.asana.com/0/my-apps
// and replace these values with your actual credentials
const ASANA_CLIENT_ID = '1211524313577501';
const ASANA_CLIENT_SECRET = 'f443efb34528510ffc42bb1ad18a0d53';
const REDIRECT_URI = chrome.identity.getRedirectURL();

// Log the redirect URI for debugging
console.log('Extension Redirect URI:', REDIRECT_URI);

// ========================================
// TOKEN MANAGEMENT
// ========================================

/**
 * Retrieve access token from chrome.storage
 */
async function getAccessToken() {
  const result = await chrome.storage.local.get(['asana_access_token']);
  return result.asana_access_token;
}

// ========================================
// OAUTH AUTHENTICATION FLOW
// ========================================

/**
 * Initiate OAuth flow to get user authorization
 */
async function authenticateWithAsana() {
  try {
    const authUrl = `${ASANA_OAUTH_URL}?client_id=${ASANA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=random_state_string`;

    // Launch OAuth flow
    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });

    // Extract authorization code from redirect URL
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ASANA_CLIENT_ID,
        client_secret: ASANA_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      chrome.storage.local.set({ asana_access_token: tokenData.access_token });
      return { success: true, token: tokenData.access_token };
    } else {
      throw new Error('Failed to get access token');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// ASANA API CALLS
// ========================================

/**
 * Make authenticated API call to Asana
 */
async function asanaApiCall(endpoint, options = {}) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not authenticated. Please sign in to Asana.');
  }

  const response = await fetch(`${ASANA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired or invalid
    await chrome.storage.local.remove(['asana_access_token']);
    throw new Error('Authentication expired. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch all projects accessible to the user
 */
async function fetchUserProjects() {
  try {
    const data = await asanaApiCall('/projects?opt_fields=gid,name,workspace.name&limit=100');
    return { success: true, projects: data.data };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a task in Asana
 */
async function createTask(projectGid, taskData) {
  try {
    const data = await asanaApiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          name: taskData.name,
          notes: taskData.description || '',
          projects: [projectGid],
          due_on: taskData.dueDate || null,
          assignee: taskData.assignee || null,
          // Add more fields as needed
        }
      })
    });
    return { success: true, task: data.data };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// MESSAGE HANDLERS
// ========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations properly
  (async () => {
    try {
      switch (request.action) {
        case 'authenticate':
          const authResult = await authenticateWithAsana();
          sendResponse(authResult);
          break;

        case 'getAccessToken':
          const token = await getAccessToken();
          sendResponse({ success: true, token: token });
          break;

        case 'fetchProjects':
          const projectsResult = await fetchUserProjects();
          sendResponse(projectsResult);
          break;

        case 'createTask':
          const taskResult = await createTask(request.projectGid, request.taskData);
          sendResponse(taskResult);
          break;

        case 'uploadExcel':
          // Process Excel file and create multiple tasks
          const tasks = request.tasks; // Array of task data from Excel
          const projectGid = request.projectGid;

          const results = [];
          for (const taskData of tasks) {
            const result = await createTask(projectGid, taskData);
            results.push(result);
          }

          sendResponse({ success: true, results: results });
          break;

        case 'signOut':
          await chrome.storage.local.remove(['asana_access_token']);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});