import { useTenant } from '../../contexts/TenantContext';

/**
 * Higher-Order Component that wraps premium features.
 * Automatically handles rendering an upgrade prompt if the tenant lacks the required module.
 */
export function withFeatureToggle(WrappedComponent, requiredModule) {
  return function FeatureGatedComponent(props) {
    const { tenant, isLoading, hasModule } = useTenant();

    if (isLoading || !tenant) {
      return (
        <div className="feature-loading">
          <div className="pulse-skeleton"></div>
        </div>
      );
    }

    if (!hasModule(requiredModule)) {
      return (
        <div className="feature-locked">
          <div className="feature-locked-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>
          </div>
          <h3>Premium Module Locked</h3>
          <p>
            The <strong>{requiredModule}</strong> module is not included in your current
            subscription tier. Upgrade your workspace to unlock advanced capabilities.
          </p>
          <button className="btn-upgrade">View Upgrade Plans</button>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
