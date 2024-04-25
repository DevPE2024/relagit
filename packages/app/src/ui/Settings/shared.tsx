import * as ipc from '~/shared/ipc';

import { t } from '@app/modules/i18n';
import NotificationStore from '@stores/notification';

import './index.scss';

const ipcRenderer = window.Native.DANGEROUS__NODE__REQUIRE('electron:ipcRenderer');

export const showReloadNotification = () => {
	if (!NotificationStore.has('reload'))
		NotificationStore.add({
			title: t('modal.reload.title'),
			level: 'warning',
			icon: 'alert',
			description: t('modal.reload.message'),
			actions: [
				{
					label: t('modal.error.reload'),
					children: t('modal.error.reload'),
					type: 'danger',
					onClick: () => {
						ipcRenderer.invoke(ipc.RELOAD_CLIENT);
					}
				}
			]
		});
};
