const wrapper = require('./wrapper');

const getTag = props => props.tag;
const getTagId = props => getTag(props) ? getTag(props).id : '';
const getTagName = props => getTag(props) ? getTag(props).name : '';
const getTagType = props => getTag(props) ? getTag(props).type : '';

module.exports = (props = {}) => wrapper({
  headers: `
    <script src="https://cdn.jsdelivr.net/npm/tributejs@3.7.3/dist/tribute.min.js"></script>
    <script src="/static/components/tag-inline.js"></script>
    <script src="/static/components/link-preview.js"></script>
    <script src="/static/components/post-preview.js"></script>
    <script src="/static/components/post-list.js"></script>
    <script src="/static/components/tag-page.js"></script>
  `,
  content: `<tag-page tag-id="${getTagId(props)}" tag-name="${getTagName(props)}" tag-type="${getTagType(props)}"></tag-page>`,
});
