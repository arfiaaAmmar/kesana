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
    console.log(`Looking up user with email: "${email}" in workspace: ${workspaceGid}`);
    const data = await asanaApiCall(`/workspaces/${workspaceGid}/users?opt_fields=gid,email,name`);
    console.log(`Found ${data.data.length} users in workspace`);

    const user = data.data.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      console.log(`✓ Found user: ${user.name} (${user.email}) with GID: ${user.gid}`);
      return user.gid;
    } else {
      console.warn(`✗ No user found with email: ${email}`);
      console.log('Available users:', data.data.map(u => u.email).join(', '));
      return null;
    }
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

/**
 * Upload an attachment to an Asana task
 */
async function uploadAttachment(taskGid, imageData, filename = 'image.jpg') {
  try {
    // Get session cookie for auth
    const cookie = await chrome.cookies.get({
      url: 'https://app.asana.com',
      name: 'ticket'
    });

    if (!cookie) {
      throw new Error('Not logged in to Asana');
    }

    // Strip data URI prefix if present
    let base64Data = imageData;
    if (imageData.includes('base64,')) {
      base64Data = imageData.split('base64,')[1];
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Check size (Asana limit is 100MB)
    if (bytes.length > 100 * 1024 * 1024) {
      throw new Error('Image too large (max 100MB)');
    }

    // Determine MIME type from base64 header
    let mimeType = 'image/jpeg';
    if (base64Data.startsWith('iVBOR')) {
      mimeType = 'image/png';
    } else if (base64Data.startsWith('R0lGOD')) {
      mimeType = 'image/gif';
    }

    // Build multipart/form-data body manually
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const encoder = new TextEncoder();

    // Build body parts
    const parts = [];

    // Part 1: parent (task GID)
    parts.push(encoder.encode(`--${boundary}\r\n`));
    parts.push(encoder.encode('Content-Disposition: form-data; name="parent"\r\n\r\n'));
    parts.push(encoder.encode(`${taskGid}\r\n`));

    // Part 2: file
    parts.push(encoder.encode(`--${boundary}\r\n`));
    parts.push(encoder.encode(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`));
    parts.push(encoder.encode(`Content-Type: ${mimeType}\r\n\r\n`));
    parts.push(bytes);
    parts.push(encoder.encode('\r\n'));

    // Closing boundary
    parts.push(encoder.encode(`--${boundary}--\r\n`));

    // Concatenate all parts
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.length;
    }

    // Send request
    const response = await fetch(`${ASANA_API_BASE}/attachments`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Allow-Asana-Client': '1',
        'Accept': 'application/json',
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      credentials: 'include',
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Attachment uploaded:', result.data);
    return result.data;

  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
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
      const assigneeEmail = String(taskData.assignee).trim();
      console.log(`Processing assignee for task "${taskData.name}": "${assigneeEmail}"`);

      // Get workspace from project
      const projectData = await asanaApiCall(`/projects/${projectGid}?opt_fields=workspace.gid`);
      const workspaceGid = projectData.data.workspace.gid;

      // Find user by email
      const userGid = await findUserByEmail(workspaceGid, assigneeEmail);
      if (userGid) {
        taskPayload.assignee = userGid;
        console.log(`✓ Assigned task "${taskData.name}" to user GID: ${userGid}`);
      } else {
        console.warn(`✗ User not found for email: ${assigneeEmail} - task will be unassigned`);
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

    const uploadedAttachments = [];
    for (let i = 0; i < allImages.length; i++) {
      const image = allImages[i];
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
          // Upload as actual attachment
          const filename = `image_${i + 1}.jpg`;
          const attachment = await uploadAttachment(taskGid, image.data, filename);
          uploadedAttachments.push(attachment);
          console.log(`Uploaded attachment ${i + 1}/${allImages.length}`);
        }
      } catch (imageError) {
        console.warn('Error adding image:', imageError);
      }
    }

    // Update notes with attachment references
    if (uploadedAttachments.length > 0) {
      const attachmentLinks = uploadedAttachments
        .map((att, i) => `[Image ${i + 1}](${att.permalink_url})`)
        .join('\n');

      const updatedNotes = notes + '\n\n---\nAttachments:\n' + attachmentLinks;

      await asanaApiCall(`/tasks/${taskGid}`, {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            notes: updatedNotes
          }
        })
      });
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

    return { success: true, task: data.data, attachmentCount: uploadedAttachments.length };
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
      html += `<div style="margin-bottom: 12px;">
                  <img 
                      src="${imgSrc}" style="max-width: 100%; 
                      height: auto; border-radius: 4px; 
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1);" 
                   />
               </div>`;
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
    html += `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
                <strong>Notes:</strong><br>${taskData.notes.replace(/\n/g, '<br>')}
             </div>`;
  }

  html += '</body>';
  return html;
}

// ========================================
// MESSAGE HANDLERS
// ========================================

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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