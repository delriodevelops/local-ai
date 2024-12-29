const Tooltip = ({ children, content }) => {
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-neutral-900 text-neutral-100 
        text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {content}
      </div>
    </div>
  );
};

export default Tooltip;