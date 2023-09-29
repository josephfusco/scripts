#!/usr/bin/env node

/**
 * GitHub Label Fetcher
 * 
 * This script fetches labels from all repositories of a given GitHub organization 
 * and generates a CSV file with the results.
 * 
 * The CSV file will contain columns for the repository name, label name, label description, and label color.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const GITHUB_API_URL = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

/**
 * Fetch all repositories for the given organization.
 * @param {string} orgName - The name of the GitHub organization.
 * @returns {Promise<Array>} A promise that resolves with the list of repositories.
 */
export async function getAllReposForOrg(orgName) {
	const response = await fetch(`${GITHUB_API_URL}/orgs/${orgName}/repos`, {
		headers: {
			'Authorization': `token ${TOKEN}`,
			'Accept': 'application/vnd.github.v3+json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch repositories for organization ${orgName}: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Fetch labels for a given repo from GitHub.
 * @param {string} orgName - The name of the GitHub organization.
 * @param {Object} repo - The repository object.
 * @param {string} repo.name - The name of the repository.
 * @returns {Promise<Array>} A promise that resolves with the list of labels.
 */
export async function getRepoLabels(orgName, { name }) {
	const response = await fetch(`${GITHUB_API_URL}/repos/${orgName}/${name}/labels`, {
		headers: {
			'Authorization': `token ${TOKEN}`,
			'Accept': 'application/vnd.github.v3+json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch labels for ${name}: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Main function to fetch labels and generate the CSV.
 * @returns {Promise<void>}
 */
export async function main() {
	const orgName = process.argv[2];
	if (!orgName) {
		console.error('Please provide a GitHub organization name as an argument.');
		process.exit(1);
	}

	const repos = await getAllReposForOrg(orgName);
	const allLabels = [];

	for (const repo of repos) {
		console.log(`Fetching labels for ${repo.name}...`);

		try {
			const labels = await getRepoLabels(orgName, repo);
			labels.forEach(label => {
				allLabels.push([repo.name, label.name, label.description || '', label.color]);
			});
		} catch (error) {
			console.error(`Error fetching labels for ${repo.name}: ${error.message}`);
		}

		// Pause to prevent rate-limiting
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	// Write data to CSV
	fs.writeFileSync('labels.csv', 'Repo,Label,Description,Color\n' +
		allLabels.map(([repo, label, description, color]) =>
			`"${repo}","${label}","${description}","#${color}"`).join('\n'));

	console.log('CSV file created: labels.csv');
}

// Execute main function
main().catch(error => {
	console.error(`Failed to execute script: ${error.message}`);
});