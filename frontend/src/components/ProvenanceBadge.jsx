import React from 'react';

export default function ProvenanceBadge({ provenance }) {
  const getBadgeClass = (prov) => {
    switch (prov) {
      case 'measured':
        return 'tag-measured';
      case 'calculated':
        return 'tag-calculated';
      case 'model_estimated':
        return 'tag-model_estimated';
      case 'unavailable':
      default:
        return 'tag-unavailable';
    }
  };

  const getLabel = (prov) => {
    switch (prov) {
      case 'measured':
        return 'Measured';
      case 'calculated':
        return 'Calculated';
      case 'model_estimated':
        return 'Model Estimated';
      case 'unavailable':
        return 'Unavailable';
      default:
        return prov || 'Unknown';
    }
  };

  return (
    <span className={`provenance-tag ${getBadgeClass(provenance)}`} title={`Data Provenance: ${provenance}`}>
      {getLabel(provenance)}
    </span>
  );
}
