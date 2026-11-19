import { randomUUID as uuid } from 'crypto';
import type { PageProps } from '../../types';
import reactTemplate from './reactTemplate';

interface WallPageProps extends PageProps {
  instance?: string;
}

const getInstance = (props: WallPageProps = {}) => props.instance || uuid();

export default (props: WallPageProps = {}) => reactTemplate('wall', { instance: getInstance(props) }, props, `
    <script src="/static/vendor/tribute.min.js"></script>
    <script src="/static/utils/post.js"></script>
`);
