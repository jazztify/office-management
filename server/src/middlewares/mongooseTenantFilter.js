const { tenantContext } = require('./tenantResolver');

module.exports = function tenantFilterPlugin(schema) {
  // Define the hook function that will inject the tenant boundary
  const injectTenantFilter = function() {
    const currentTenantId = tenantContext.getStore();
    
    // If a tenant context exists, force the query to scope to this tenant
    if (currentTenantId) {
      // Append the tenantId to the query filter
      this.where({ tenantId: currentTenantId });
    }
  };

  // Apply the hook to all read and update operations
  const queryTypes = ['find', 'findOne', 'countDocuments', 'update', 'updateOne', 'updateMany', 'findOneAndUpdate'];
  
  queryTypes.forEach(type => {
    schema.pre(type, injectTenantFilter);
  });
};
