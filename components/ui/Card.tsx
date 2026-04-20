import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  titleIcon?: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, className = '', title, titleIcon, actions, id }, ref) => {
  const isStringTitle = typeof title === 'string';
  const titleId = isStringTitle ? `card-title-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;
  
  return (
    <section 
      ref={ref} 
      id={id}
      className={`p-5 rounded-lg shadow-lg bg-card-bg-light dark:bg-card-bg border border-neutral-300-light dark:border-neutral-700-dark ${className}`} 
      aria-labelledby={titleId}
    >
      {(title || actions) && (
        <header className="flex justify-between items-center mb-4 pb-3 border-b border-neutral-200-light dark:border-neutral-600-dark">
          {title && (
            <h3 
              id={titleId}
              className="text-lg font-semibold text-brand-green-text dark:text-brand-dark-green-text flex items-center"
            >
              {titleIcon && <span className="mr-2" aria-hidden="true">{titleIcon}</span>}
              {title}
            </h3>
          )}
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </header>
      )}
      <div className="card-content">
        {children}
      </div>
    </section>
  );
});

Card.displayName = 'Card';

export default Card;