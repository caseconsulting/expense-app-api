# The aurora module dependency doesn't work as a symlink when invoking locally. It needs to be installed without
# linking, then invoked, then reinstalled normally. Installing without symlinks causes issues with npm, but running
# still works. This script is meant to be run from the main project directory
CWD=$(pwd)

# install aurora package without symlinks, which cause errors when invoking locally
cd $CWD/layers/dependencies/nodejs > /dev/null
npm i --install-links $CWD/aurora

# invoke
cd $CWD
sam local invoke TimesheetSubmissionReminderFunction \
  --env-vars env.json \
  --event ./timesheet-submission-reminder/timesheetEvent.json \
  --template app.yaml

# install aurora normally again
cd $CWD/layers/dependencies/nodejs
npm i $CWD/aurora > /dev/null # 2>&1 # redirect stdout and stderr to null
