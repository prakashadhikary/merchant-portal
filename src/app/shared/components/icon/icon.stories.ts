import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Icon, ICON_NAMES } from './icon';

const meta: Meta<Icon> = {
  title: 'Shared/Icon',
  component: Icon,
  argTypes: {
    name: { control: 'select', options: ICON_NAMES },
    size: { control: { type: 'range', min: 12, max: 64, step: 2 } },
  },
  args: { name: 'shield', size: 24 },
};
export default meta;

type Story = StoryObj<Icon>;

export const Default: Story = {};

export const Gallery: Story = {
  render: () => ({
    props: { names: ICON_NAMES },
    moduleMetadata: { imports: [Icon] },
    template: `
      <ul class="list-unstyled d-flex flex-wrap gap-4 mb-0">
        @for (name of names; track name) {
          <li class="text-center small" style="width: 5rem">
            <mp-icon [name]="name" [size]="24" />
            <div class="text-secondary mt-1">{{ name }}</div>
          </li>
        }
      </ul>
    `,
  }),
};
