function parseStatus(properties) {
  const result = { ...properties };

  if (!result.status) {
    return result;
  }

  for (const segment of result.status.split(',')) {
    const [key, ...valueParts] = segment.split(':');
    const value = valueParts.join(':');

    switch (key) {
      case 'progress':
        result.progress = value.split(' ');
        result.latestProgress = parseFloat(result.progress[0]?.split('%')[0]);
        break;
      case 'progress_estimate':
        result.progress_estimate = value.split(' ');
        result.latestProgress = parseFloat(result.progress_estimate[0]?.split('%')[0]);
        break;
      case 'signal_progress':
        result.signal_progress = value.split(' ');
        result.latestSignalProgress = parseFloat(result.signal_progress[0]?.split('%')[0]);
        break;
      case 'tender':
        result.tender = value;
        break;
      case 'builder':
        result.builder = value;
        break;
      case 'severance':
        result.severance = value;
        break;
      case 'financing':
        result.financing = value;
        break;
      case 'winner':
        result.winner = value;
        break;
      case 'PTE':
        result.PTE = true;
        break;
      case 'AM':
        result.AM = true;
        break;
      case 'AC':
        result.AC = true;
        break;
      default:
        break;
    }
  }

  result.hadStatus = true;
  delete result.status;
  return result;
}

function classifyProject(properties) {
  const p = parseStatus(properties);

  if (p.highway) {
    if (p.highway === 'construction' || p.highway === 'proposed') {
      if (p.AC && p.latestProgress != null) return 'road_under_construction_with_progress';
      if (p.AC && p.severance) return 'road_unassigned_or_terminated';
      if (p.AC && p.builder) return 'road_assigned_missing_am';
      if (p.AM && !p.PTE) return 'road_with_am_no_pt';
      if (p.PTE && !p.AC) return 'road_with_pt_no_ac';
      if (!p.AC && !p.PTE && !p.AM) return 'road_unassigned_no_permits';
      return 'road_under_construction';
    }
    if (p.access === 'no') return 'road_completed_no_access';
    if (p.start_date || p.access_note) return 'road_in_circulation';
    if (p.highway === 'proposed') return 'road_proposed';
    return 'road_other';
  }

  if (p.railway) {
    if (p.railway === 'construction') return 'rail_under_construction';
    if (p.railway === 'proposed') return 'rail_proposed';
    if (p.start_date) return 'rail_completed';
    return 'rail_other';
  }

  return 'unknown';
}

module.exports = { parseStatus, classifyProject };
