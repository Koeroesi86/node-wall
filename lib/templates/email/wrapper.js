const getTitle = props => props.title ? `[Üzenőfal] ${props.title}` : 'Üzenőfal';
const getHeaders = props => props.headers || '';
const getContent = props => props.content || '';

module.exports = async (props = {}) => (`
<html lang="hu">
<head>
  <title>${getTitle(props)}</title>
  <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${getHeaders(props)}
</head>
<body style="margin: 0; padding: 0;">
<div style="width: 100%; min-height: 100%; background: #ccc; padding: 12px 0;">
  <div style="margin: 0 auto;max-width: 600px;background: #fff;border-radius: 6px;overflow: hidden;box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.2);">
    <div style="height: 50px; line-height: 50px; padding: 0 12px; background: #ffdcb1; font-size: 16px;">
      Üzenőfal
    </div>
    <div style="padding: 12px 20px 24px 20px; font-size: 14px;">
      ${getContent(props)}
    </div>
    <div style="text-align: center; background: #efefef; line-height: 35px; height: 35px;">
      &copy; Üzenőfal
    </div>
  </div>
</div>
</body>
</html>
`);
