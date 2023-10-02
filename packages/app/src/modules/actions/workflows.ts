const sucrase = window.Native.DANGEROUS__NODE__REQUIRE('sucrase') as typeof import('sucrase');
const path = window.Native.DANGEROUS__NODE__REQUIRE('path') as typeof import('path');
const fs = window.Native.DANGEROUS__NODE__REQUIRE('fs') as typeof import('fs');
const os = window.Native.DANGEROUS__NODE__REQUIRE('os') as typeof import('os');

import RepositoryStore from '@stores/repository';
import LocationStore from '@stores/location';
import * as Git from '@modules/git';

type action =
	| 'commit'
	| 'pull_request'
	| 'push'
	| 'release'
	| 'repository_dispatch'
	| 'schedule'
	| 'workflow_dispatch'
	| 'remote_fetch';

const defFile = `/** This file was generated by relagit. Do not modify it. **/

type action = "commit" | "pull_request" | "push" | "release" | "repository_dispatch" | "schedule" | "workflow_dispatch" | "remote_fetch";

interface WorkflowOptions {
    on: action | action[];
    name: string;
    description?: string;
    steps: {
        name?: string;
        run: (event: any, ...params: any[]) => Promise<void> | void;
    }[];
}

interface Context {
    Git: {
        push: (event: any) => Promise<void>;
        commit: (event: any) => Promise<void>;
    };
}

interface Relagit {
    actions: {
        Workflow: new (options: WorkflowOptions) => void;
        context: () => Context;
    };
}

declare module "relagit:actions" {
    const actions: Relagit;
    export default actions;
}`;

export interface Workflow {
	on: action | action[];
	name: string;
	description?: string;
	steps: {
		name?: string;
		run: (event: action, ...params: unknown[]) => Promise<void> | void;
	}[];
}

const __WORKFLOWS_PATH__ = path.join(os.homedir(), '.relagit', 'workflows');

const extnames = (str: string) => {
	const extenstions = str.split('.');
	extenstions.shift();

	return `${extenstions.join('.')}`;
};

export const loadWorkflows = async () => {
	if (!fs.existsSync(__WORKFLOWS_PATH__)) {
		fs.mkdirSync(__WORKFLOWS_PATH__);
	}

	if (!fs.existsSync(path.join(__WORKFLOWS_PATH__, 'index.d.ts'))) {
		await fs.promises.writeFile(path.join(__WORKFLOWS_PATH__, 'index.d.ts'), defFile);
	}

	let _workflows = fs.readdirSync(__WORKFLOWS_PATH__);

	_workflows = _workflows.filter(
		(workflow) => ['ts', 'js'].includes(extnames(workflow)) && !workflow.endsWith('.d.ts')
	);

	for (const workflowPath of _workflows) {
		try {
			const require = (id: string) => {
				if (id.startsWith('relagit')) {
					const submodule = id.split(':')[1];

					switch (submodule) {
						case 'actions':
							return {
								Workflow: class Workflow {
									on: action | action[];
									name: string;
									description?: string;
									steps: {
										name?: string;
										run: (event: action) => Promise<void> | void;
									}[];

									constructor(options: Workflow) {
										this.on = options.on;
										this.name = options.name;
										this.description = options.description;
										this.steps = options.steps;
									}
								},
								context: getContext
							};
						case 'client':
							return {};
					}

					return null;
				}
			};

			const data = await fs.promises.readFile(
				path.join(__WORKFLOWS_PATH__, workflowPath),
				'utf8'
			);

			const fn = new Function(
				'require',
				'exports',
				'module',
				'console',
				sucrase.transform(data, {
					transforms: ['typescript', 'imports']
				}).code + '\n\nreturn module.exports || exports.default || exports || null;'
			);

			const workflow = fn(require, {}, {}, makeConsole(path.basename(workflowPath)));

			workflows.add(workflow);
		} catch (e) {
			console.error('Failed to load workflow', e);
		}
	}
};

export const workflows = new Set<Workflow>();

export const triggerWorkflow = async (event: action, ...params: unknown[]) => {
	for (const workflow of workflows) {
		if (Array.isArray(workflow.on)) {
			if (workflow.on.includes(event)) {
				for (const step of workflow.steps) {
					await step.run(event, ...params);
				}
			}
		} else {
			if (workflow.on === event) {
				for (const step of workflow.steps) {
					await step.run(event, ...params);
				}
			}
		}
	}
};

const makeContext = (location: string) => {
	const context = {
		Git: {
			push: async () => {
				Git;
			}
		},
		Repository: {
			path: location,
			...(RepositoryStore.getByPath(location) ?? {})
		}
	};

	return context;
};

export const getContext = () => {
	return makeContext(LocationStore.selectedRepository?.path);
};

export const makeConsole = (prefix: string) => {
	return {
		log: (...args: unknown[]) => {
			console.log(`%c[${prefix}]`, 'color: #7AA2F7', ...args);
		},
		info: (...args: unknown[]) => {
			console.log(`%c[${prefix}]`, 'color: #7AA2F7', ...args);
		},
		warn: (...args: unknown[]) => {
			console.log(`%c[${prefix}]`, 'color: #e5c062', ...args);
		},
		error: (...args: unknown[]) => {
			console.log(`%c[${prefix}]`, 'color: #e56269', ...args);
		}
	};
};
