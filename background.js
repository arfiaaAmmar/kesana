// ========================================
// ASANA API CONFIGURATION
// ========================================

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

console.log('Kesana Extension Background Service Worker Initialized');

// ========================================
// ASANA API CALLS USING COOKIES
// ========================================

/**
 * Make authenticated API call to Asana using session cookies
 */
async function asanaApiCall(endpoint, options = {}) {
  // Get the Asana session cookie
  const cookie = await chrome.cookies.get({
    url: 'https://app.asana.com',
    name: 'ticket'
  });

  if (!cookie) {
    throw new Error('Not logged in to Asana. Please log in to Asana first.');
  }

  const url = `${ASANA_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Allow-Asana-Client': '1',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include'
  });

  if (response.status === 401) {
    throw new Error('Not authenticated. Please log in to Asana.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetch user's workspaces
 */
async function fetchUserWorkspaces() {
  try {
    const data = await asanaApiCall('/workspaces');
    return { success: true, workspaces: data.data };
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all projects accessible to the user
 */
async function fetchUserProjects() {
  try {
    // First get the user's workspaces
    const workspacesResult = await fetchUserWorkspaces();
    if (!workspacesResult.success || !workspacesResult.workspaces.length) {
      throw new Error('No workspaces found');
    }

    // Get projects from all workspaces
    const allProjects = [];
    for (const workspace of workspacesResult.workspaces) {
      const data = await asanaApiCall(`/projects?workspace=${workspace.gid}&opt_fields=gid,name,workspace.name&limit=100`);
      allProjects.push(...data.data);
    }

    return { success: true, projects: allProjects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Find user by email in workspace
 */
async function findUserByEmail(workspaceGid, email) {
  try {
    const data = await asanaApiCall(`/workspaces/${workspaceGid}/users?opt_fields=gid,email`);
    const user = data.data.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    return user ? user.gid : null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

/**
 * Create a task in Asana
 */
async function createTask(projectGid, taskData) {
  try {
    // Build task data object with description only (no large images)
    const taskPayload = {
      name: taskData.name,
      projects: [projectGid]
    };

    // Add description as notes (without images to avoid size limit)
    let notes = '';
    if (taskData.description) {
      notes = taskData.description;
    }
    if (taskData.notes) {
      notes += (notes ? '\n\n---\nNotes:\n' : '') + taskData.notes;
    }
    if (notes) {
      taskPayload.notes = notes;
    }

    if (taskData.dueDate) {
      taskPayload.due_on = taskData.dueDate;
    }

    // If assignee is provided, try to find the user by email
    if (taskData.assignee) {
      // Get workspace from project
      const projectData = await asanaApiCall(`/projects/${projectGid}?opt_fields=workspace.gid`);
      const workspaceGid = projectData.data.workspace.gid;

      // Find user by email
      const userGid = await findUserByEmail(workspaceGid, taskData.assignee);
      if (userGid) {
        taskPayload.assignee = userGid;
      } else {
        console.warn(`User not found for email: ${taskData.assignee}`);
      }
    }

    const data = await asanaApiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify({ data: taskPayload })
    });

    const taskGid = data.data.gid;

    // Upload images as attachments
    const allImages = [];
    if (taskData.imageUrls && taskData.imageUrls.length > 0) {
      allImages.push(...taskData.imageUrls.map(url => ({ type: 'url', data: url })));
    }
    if (taskData.imageData && taskData.imageData.length > 0) {
      allImages.push(...taskData.imageData.map(data => ({ type: 'base64', data: data })));
    }

    for (const image of allImages) {
      try {
        if (image.type === 'url') {
          // Add comment with image URL
          await asanaApiCall(`/tasks/${taskGid}/stories`, {
            method: 'POST',
            body: JSON.stringify({
              data: {
                text: `Image: ${image.data}`
              }
            })
          });
        } else if (image.type === 'base64') {
          // For base64 images, add as a comment with the base64 data
          // Note: Asana API doesn't support direct base64 upload via REST API
          // We'll add it as a comment for now
          await asanaApiCall(`/tasks/${taskGid}/stories`, {
            method: 'POST',
            body: JSON.stringify({
              data: {
                text: '[Image attached - view in Excel or re-upload via Asana UI]'
              }
            })
          });
        }
      } catch (imageError) {
        console.warn('Error adding image:', imageError);
      }
    }

    // Add tags if provided
    if (taskData.tags && taskData.tags.length > 0) {
      for (const tag of taskData.tags) {
        try {
          await asanaApiCall(`/tasks/${taskGid}/addTag`, {
            method: 'POST',
            body: JSON.stringify({ data: { tag: tag } })
          });
        } catch (tagError) {
          console.warn('Error adding tag:', tag, tagError);
        }
      }
    }

    return { success: true, task: data.data };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: error.message, taskName: taskData.name };
  }
}

/**
 * Build HTML description with images on the left
 */
function buildTaskHtmlDescription(taskData) {
  let html = '<body>';

  // Combine URL-based images and base64 embedded images
  const allImages = [];

  if (taskData.imageUrls && taskData.imageUrls.length > 0) {
    allImages.push(...taskData.imageUrls);
  }

  if (taskData.imageData && taskData.imageData.length > 0) {
    allImages.push(...taskData.imageData);
  }

  // If there are images, create a two-column layout
  if (allImages.length > 0) {
    html += '<div style="display: flex; gap: 20px; align-items: flex-start;">';

    // Left column: Images
    html += '<div style="flex-shrink: 0; width: 300px;">';
    allImages.forEach(imgSrc => {
      html += `<div style="margin-bottom: 12px;"><img src="${imgSrc}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></div>`;
    });
    html += '</div>';

    // Right column: Description
    html += '<div style="flex: 1;">';
    if (taskData.description) {
      html += `<div>${taskData.description.replace(/\n/g, '<br>')}</div>`;
    }
    html += '</div>';

    html += '</div>';
  } else {
    // No images, just show description
    if (taskData.description) {
      html += `<div>${taskData.description.replace(/\n/g, '<br>')}</div>`;
    }
  }

  // Add notes section below
  if (taskData.notes) {
    html += `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e0e0;"><strong>Notes:</strong><br>${taskData.notes.replace(/\n/g, '<br>')}</div>`;
  }

  html += '</body>';
  return html;
}

// ========================================
// MESSAGE HANDLERS
// ========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations properly
  (async () => {
    try {
      switch (request.action) {
        case 'checkAuth':
          // Check if user is logged in to Asana by checking cookie
          const cookie = await chrome.cookies.get({
            url: 'https://app.asana.com',
            name: 'ticket'
          });
          sendResponse({ success: true, isAuthenticated: !!cookie });
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

          console.log('Creating tasks for project:', projectGid);
          console.log('Number of tasks to create:', tasks.length);

          const results = [];
          for (const taskData of tasks) {
            console.log('Creating task:', taskData.name);
            const result = await createTask(projectGid, taskData);
            console.log('Task creation result:', result);
            results.push(result);
          }

          console.log('All tasks created. Results:', results);
          sendResponse({ success: true, results: results });
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