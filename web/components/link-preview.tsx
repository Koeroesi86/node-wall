import { useEffect } from 'react';
import { useRedux } from '../use-redux.ts';
import './link-preview.css';

interface LinkPreviewProps {
  href: string;
  postId: string;
}

const descriptionLimit = 150;

export const LinkPreview = ({ href, postId }: LinkPreviewProps) => {
  const { state, dispatch } = useRedux();
  const link = state?.links[href];

  useEffect(() => {
    dispatch(linksActions.request(href, postId));
  }, [dispatch, href, postId]);

  return (
    <a className="link-preview" href={href} target="_blank" title={link?.title || undefined}>
      <div className={link?.image ? 'preview hasImage' : 'preview'}>
        {!link && href}
        {link && <>
          {link.image && <img src={link.image} className="image" alt={link.title} />}
          <div className="meta">
            <div className="title" title={link.title}>{link.title}</div>
            <div className="description">
              {link.description.substring(0, descriptionLimit)}
              {link.description.length > descriptionLimit && '…'}
            </div>
            <div className="url">{link.url}</div>
          </div>
        </>}
      </div>
    </a>
  );
};
