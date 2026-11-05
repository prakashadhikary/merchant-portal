import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Avatar } from './avatar';

const meta: Meta<Avatar> = {
  title: 'Shared/Avatar',
  component: Avatar,
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: { name: 'Sita Gurung', size: 'md' },
};
export default meta;

type Story = StoryObj<Avatar>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [Avatar] },
    template: `
      <div class="d-flex align-items-center gap-3">
        <mp-avatar [name]="name" size="sm" />
        <mp-avatar [name]="name" size="md" />
        <mp-avatar [name]="name" size="lg" />
      </div>
    `,
  }),
};

export const Tones: Story = {
  render: () => ({
    props: {
      names: [
        'Sita Gurung',
        'Rita Shrestha',
        'Anita Karki',
        'Bikash Thapa',
        'Maya Rai',
        'Prem Tamang',
      ],
    },
    moduleMetadata: { imports: [Avatar] },
    template: `
      <div class="d-flex flex-wrap gap-2">
        @for (name of names; track name) {
          <mp-avatar [name]="name" />
        }
      </div>
    `,
  }),
};
