const fs = require('fs');
const path = require('path');
const https = require('https');

const USERNAME = 'tarunagnihotri534';
const IGNORE_REPOS = [USERNAME, 'QR-Code-Generator']; // Ignore profile and specified repos
const PINNED_REPOS = ['RouteLens', 'DocSense', 'PROPTRACE-SDK', 'EnvShield'];
const MAX_PROJECTS = 4;
const TERMINAL_SVG_PATH = path.join(__dirname, '..', 'assets', 'terminal.svg');

function get(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'node.js-profile-updater',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    if (process.env.GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function getLatestCommit(repoName) {
  try {
    const commitsUrl = `https://api.github.com/repos/${USERNAME}/${repoName}/commits?per_page=1`;
    const commits = await get(commitsUrl);
    if (commits && commits.length > 0) {
      const sha = commits[0].sha.substring(0, 6);
      let message = commits[0].commit.message.split('\n')[0];
      // Truncate message to 35 chars
      if (message.length > 35) {
        message = message.substring(0, 32) + '...';
      }
      return { sha, message };
    }
  } catch (err) {
    console.error(`Error fetching commits for ${repoName}:`, err.message);
  }
  return { sha: 'd5a3c0', message: 'init: setup repository workspace' };
}

async function main() {
  try {
    console.log(`Fetching user profile details for ${USERNAME}...`);
    const userProfileUrl = `https://api.github.com/users/${USERNAME}`;
    const userProfile = await get(userProfileUrl);
    const reposCount = userProfile.public_repos !== undefined ? userProfile.public_repos : 21;
    const followersCount = userProfile.followers !== undefined ? userProfile.followers : 4;
    const isHireable = userProfile.hireable !== null && userProfile.hireable !== undefined ? userProfile.hireable : true;

    console.log(`Fetching active repositories for ${USERNAME}...`);
    const reposUrl = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=50`;
    const allRepos = await get(reposUrl);
    
    // Prioritize pinned repositories
    const pinnedReposList = [];
    PINNED_REPOS.forEach(name => {
      const found = allRepos.find(repo => repo.name.toLowerCase() === name.toLowerCase());
      if (found) {
        pinnedReposList.push(found);
      }
    });

    // Fetch other active repos
    const otherReposList = allRepos.filter(repo => {
      const isPinned = PINNED_REPOS.some(name => name.toLowerCase() === repo.name.toLowerCase());
      const isIgnored = IGNORE_REPOS.some(name => name.toLowerCase() === repo.name.toLowerCase());
      return !isPinned && !isIgnored && !repo.fork;
    });

    const activeRepos = [...pinnedReposList, ...otherReposList].slice(0, MAX_PROJECTS);
    console.log(`Found ${activeRepos.length} active projects.`);
    
    const projects = [];
    for (const repo of activeRepos) {
      console.log(`Fetching latest commit for ${repo.name}...`);
      const commit = await getLatestCommit(repo.name);
      projects.push({
        name: repo.name,
        language: repo.language || 'TypeScript',
        sha: commit.sha,
        commitMessage: commit.message
      });
    }

    // Fill up to 4 if less are returned (failsafe)
    while (projects.length < MAX_PROJECTS) {
      projects.push({
        name: 'Workspace',
        language: 'TypeScript',
        sha: 'd5a3c0',
        commitMessage: 'init: setup developer profile workspace'
      });
    }

    console.log('Project configuration fetched:', projects);
    
    // Colors for the project bullets
    const colors = ['#e3b341', '#58a6ff', '#3fb950', '#bc8cff'];
    
    // Format the project list SVG lines
    let projectListSvg = '';
    let yPosProjects = [262, 284, 306, 328];
    projects.forEach((proj, idx) => {
      const repoStr = `${proj.name}/`;
      const spacesCount = Math.max(1, 18 - repoStr.length);
      const spaces = ' '.repeat(spacesCount);
      const color = colors[idx % colors.length];
      projectListSvg += `    <text x="36" y="${yPosProjects[idx]}" font-size="14"><tspan fill="${color}">  &#x25CF; </tspan><tspan fill="#58a6ff" font-weight="700">${repoStr}</tspan><tspan fill="#484f58">${spaces}${proj.language}</tspan></text>\n`;
    });
    projectListSvg = projectListSvg.trimEnd();

    // Format the git log SVG lines
    let gitLogSvg = '';
    let yPosGit = [468, 490, 512, 534];
    projects.forEach((proj, idx) => {
      gitLogSvg += `    <text x="36" y="${yPosGit[idx]}" font-size="14"><tspan fill="#3fb950">  * </tspan><tspan fill="#e3b341">${proj.sha}</tspan><tspan fill="#e6edf3" font-weight="700">  ${proj.commitMessage}</tspan><tspan fill="#39c5cf">  (${proj.name})</tspan></text>\n`;
    });
    gitLogSvg = gitLogSvg.trimEnd();

    // Format Stats Line
    const statsSvg = `    <text x="36" y="206" font-size="14"><tspan fill="#484f58">repos: </tspan><tspan fill="#e3b341" font-weight="700">${reposCount}</tspan><tspan fill="#484f58">   followers: </tspan><tspan fill="#e3b341" font-weight="700">${followersCount}</tspan><tspan fill="#484f58">   hireable: </tspan><tspan fill="#3fb950" font-weight="700">${isHireable}</tspan></text>`;

    // Update terminal.svg
    let svgContent = fs.readFileSync(TERMINAL_SVG_PATH, 'utf8');
    
    // Replace Stats
    const statsRegex = /(<!-- STATS_START -->)([\s\S]*?)(<!-- STATS_END -->)/;
    svgContent = svgContent.replace(statsRegex, `$1\n${statsSvg}\n    $3`);

    // Replace Projects List
    const projectsRegex = /(<!-- PROJECTS_LIST_START -->)([\s\S]*?)(<!-- PROJECTS_LIST_END -->)/;
    svgContent = svgContent.replace(projectsRegex, `$1\n${projectListSvg}\n    $3`);
    
    // Replace Git Log
    const gitLogRegex = /(<!-- GIT_LOG_START -->)([\s\S]*?)(<!-- GIT_LOG_END -->)/;
    svgContent = svgContent.replace(gitLogRegex, `$1\n${gitLogSvg}\n    $3`);

    fs.writeFileSync(TERMINAL_SVG_PATH, svgContent, 'utf8');
    console.log('Successfully updated terminal.svg with active projects and stats.');

    // Update README.md with a cache-busting version query string to bypass GitHub Camo cache
    const readmePath = path.join(__dirname, '..', 'README.md');
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, 'utf8');
      const readmeRegex = /(src="\.\/assets\/terminal\.svg)(\?v=[^"\s]+)?(")/;
      readmeContent = readmeContent.replace(readmeRegex, `$1?v=${Date.now()}$3`);
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
      console.log('Successfully updated README.md with cache-buster query string.');
    }

  } catch (error) {
    console.error('Fatal execution error:', error.message);
    process.exit(1);
  }
}

main();
