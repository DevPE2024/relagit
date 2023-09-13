import { JSX } from 'solid-js';
import './index.scss';

interface IButtonProps {
	children: JSX.Element | JSX.Element[];
	type: 'default' | 'brand' | 'danger' | 'outline' | 'positive';
	onClick: () => void;
	className?: string;
	disabled?: boolean;
	label: string;
}

export default (props: IButtonProps) => {
	return (
		<button
			aria-role="button"
			aria-label={props.label}
			aria-disabled={props.disabled}
			class={`button ${props.type} ${props.className || ''}`}
			onClick={props.onClick}
			disabled={props.disabled}
		>
			{props.children}
		</button>
	);
};
