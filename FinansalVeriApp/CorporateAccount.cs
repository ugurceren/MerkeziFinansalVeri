using System.ComponentModel;

namespace FinansalVeriApp
{
    public class CorporateAccount : INotifyPropertyChanged
    {
        private int _accountId;
        private string _accountName;
        private string _responsibleTeam;

        public int AccountId
        {
            get => _accountId;
            set
            {
                _accountId = value;
                OnPropertyChanged(nameof(AccountId));
            }
        }

        public string AccountName
        {
            get => _accountName;
            set
            {
                _accountName = value;
                OnPropertyChanged(nameof(AccountName));
            }
        }

        public string ResponsibleTeam
        {
            get => _responsibleTeam;
            set
            {
                _responsibleTeam = value;
                OnPropertyChanged(nameof(ResponsibleTeam));
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}