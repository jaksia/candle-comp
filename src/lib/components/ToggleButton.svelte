<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		checked = $bindable(false),
		disabled = false,
		ontoggle = () => {},
		inline = true,
		label,
		class: className = ''
	}: {
		checked: boolean;
		disabled?: boolean;
		inline?: boolean;
		ontoggle?: (value: boolean) => void;
		label: string;
		class?: string;
	} = $props();
</script>

<button
	class={[
		'items-center gap-1 rounded border pr-2! p-1 transition-colors duration-200',
		inline ? 'inline-flex' : 'flex',
		disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
		checked && !disabled
			? 'border-green-500 bg-green-500/20 text-green-500'
			: 'border-gray-400 bg-gray-400/20 text-gray-400',
		className
	]}
	onclick={() => {
		if (!disabled) {
			checked = !checked;
			ontoggle(checked);
		}
	}}
>
	<span class="relative *:transition-opacity *:duration-200">
		<Icon icon="mdi:check" class={['size-5 cursor-pointer ', !checked && 'opacity-0']} />
		<Icon
			icon="mdi:close"
			class={['absolute inset-0 size-5 cursor-pointer', checked && 'opacity-0']}
		/>
	</span>
	<span class="text-sm font-medium">{label}</span>
</button>
